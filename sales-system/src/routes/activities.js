const express = require('express');
const { db } = require('../db');
const { renderTemplate } = require('../util/template');

const router = express.Router();
const CHANNELS = ['email', 'dm', 'instagram_dm', 'phone', 'visit', 'other'];
const STATUSES = ['sent', 'opened', 'replied', 'no_response', 'booked', 'declined', 'failed'];

router.get('/recent', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db
    .prepare(`
      SELECT a.*, p.name as prospect_name
      FROM activities a JOIN prospects p ON p.id = a.prospect_id
      ORDER BY a.occurred_at DESC LIMIT ?
    `)
    .all(limit);
  res.json({ activities: rows });
});

router.get('/prospects/:id/activities', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM activities WHERE prospect_id = ? ORDER BY occurred_at DESC')
    .all(req.params.id);
  res.json({ activities: rows });
});

router.post('/prospects/:id/activities', (req, res) => {
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).json({ error: '店舗が見つかりません' });

  const { channel, direction = 'outbound', status = 'sent', content = '', occurred_at } = req.body || {};
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: '不正なchannelです' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: '不正なstatusです' });

  const info = db
    .prepare(`
      INSERT INTO activities (prospect_id, channel, direction, status, content, occurred_at)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `)
    .run(req.params.id, channel, direction, status, content, occurred_at || null);

  if (direction === 'outbound' && (prospect.stage === 'research' || prospect.stage === 'listed')) {
    db.prepare(`UPDATE prospects SET stage = 'contacted', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  }
  if (status === 'replied') {
    db.prepare(`UPDATE prospects SET stage = 'replied', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ activity });
});

router.delete('/activities/:id', (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Renders a DM/Instagram-DM template against a prospect so the operator can
// copy the text and paste it manually into Instagram or another DM app.
// This app never sends DMs automatically — see README for why.
router.post('/prospects/:id/render-dm', (req, res) => {
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).json({ error: '店舗が見つかりません' });
  const { template_id } = req.body || {};
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  if (!template) return res.status(404).json({ error: 'テンプレートが見つかりません' });

  res.json({
    subject: renderTemplate(template.subject, prospect),
    body: renderTemplate(template.body, prospect),
  });
});

module.exports = router;
module.exports.CHANNELS = CHANNELS;
module.exports.STATUSES = STATUSES;
