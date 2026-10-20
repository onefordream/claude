const express = require('express');
const { db } = require('../db');
const { sendMail, isMailConfigured } = require('../mailer');
const { renderTemplate } = require('../util/template');

const router = express.Router();

router.get('/', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all();
  const withStats = campaigns.map((c) => {
    const stats = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM email_sends WHERE campaign_id = ?
      `)
      .get(c.id);
    return { ...c, stats };
  });
  res.json({ campaigns: withStats });
});

router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: '見つかりません' });
  const sends = db
    .prepare(`
      SELECT es.*, p.name as prospect_name, p.email as prospect_email
      FROM email_sends es JOIN prospects p ON p.id = es.prospect_id
      WHERE es.campaign_id = ? ORDER BY es.id
    `)
    .all(req.params.id);
  res.json({ campaign, sends });
});

// Creates a campaign and immediately sends the rendered template to every
// selected prospect that has an email address. Each send is logged to
// email_sends and mirrored into activities so a prospect's full outreach
// history (email + DM + phone) lives in one timeline.
router.post('/', async (req, res) => {
  const { name, template_id, prospect_ids } = req.body || {};
  if (!name || !template_id || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
    return res.status(400).json({ error: 'name, template_id, prospect_ids は必須です' });
  }
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  if (!template) return res.status(404).json({ error: 'テンプレートが見つかりません' });
  if (!isMailConfigured()) {
    return res.status(400).json({ error: 'SMTP設定が未完了です。設定画面でメール送信情報を入力してください。' });
  }

  const campaignInfo = db
    .prepare('INSERT INTO campaigns (name, template_id) VALUES (?, ?)')
    .run(name, template_id);
  const campaignId = campaignInfo.lastInsertRowid;

  const insertSend = db.prepare(`
    INSERT INTO email_sends (prospect_id, campaign_id, template_id, subject, body, status, error, sent_at)
    VALUES (@prospect_id, @campaign_id, @template_id, @subject, @body, @status, @error, @sent_at)
  `);
  const insertActivity = db.prepare(`
    INSERT INTO activities (prospect_id, channel, direction, status, content)
    VALUES (?, 'email', 'outbound', ?, ?)
  `);

  const results = [];
  for (const id of prospect_ids) {
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(id);
    if (!prospect) continue;
    const subject = renderTemplate(template.subject, prospect);
    const body = renderTemplate(template.body, prospect);

    if (!prospect.email) {
      insertSend.run({
        prospect_id: id, campaign_id: campaignId, template_id,
        subject, body, status: 'failed', error: 'メールアドレス未登録', sent_at: null,
      });
      results.push({ prospect_id: id, status: 'failed', error: 'メールアドレス未登録' });
      continue;
    }

    try {
      await sendMail({ to: prospect.email, subject, text: body });
      insertSend.run({
        prospect_id: id, campaign_id: campaignId, template_id,
        subject, body, status: 'sent', error: null, sent_at: new Date().toISOString(),
      });
      insertActivity.run(id, 'sent', body);
      db.prepare(`UPDATE prospects SET stage = CASE WHEN stage = 'research' OR stage = 'listed' THEN 'contacted' ELSE stage END, updated_at = datetime('now') WHERE id = ?`).run(id);
      results.push({ prospect_id: id, status: 'sent' });
    } catch (e) {
      insertSend.run({
        prospect_id: id, campaign_id: campaignId, template_id,
        subject, body, status: 'failed', error: e.message, sent_at: null,
      });
      insertActivity.run(id, 'failed', body);
      results.push({ prospect_id: id, status: 'failed', error: e.message });
    }
  }

  res.status(201).json({ campaign_id: campaignId, results });
});

module.exports = router;
