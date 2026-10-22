const express = require('express');
const { getSettings, setSetting } = require('../db');
const { SMTP_KEYS, isMailConfigured, sendMail } = require('../mailer');

const router = express.Router();

router.get('/', (req, res) => {
  const s = getSettings([...SMTP_KEYS, 'google_places_api_key']);
  res.json({
    smtp_host: s.smtp_host || '',
    smtp_port: s.smtp_port || '587',
    smtp_secure: s.smtp_secure || 'false',
    smtp_user: s.smtp_user || '',
    smtp_pass_set: Boolean(s.smtp_pass),
    mail_from: s.mail_from || '',
    configured: isMailConfigured(),
    google_places_api_key_set: Boolean(s.google_places_api_key),
  });
});

router.put('/', (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, mail_from, google_places_api_key } = req.body || {};
  if (smtp_host !== undefined) setSetting('smtp_host', String(smtp_host).trim());
  if (smtp_port !== undefined) setSetting('smtp_port', String(smtp_port).trim());
  if (smtp_secure !== undefined) setSetting('smtp_secure', String(Boolean(smtp_secure)));
  if (smtp_user !== undefined) setSetting('smtp_user', String(smtp_user).trim());
  if (mail_from !== undefined) setSetting('mail_from', String(mail_from).trim());
  if (smtp_pass) setSetting('smtp_pass', String(smtp_pass));
  if (google_places_api_key) setSetting('google_places_api_key', String(google_places_api_key).trim());
  res.json({ ok: true, configured: isMailConfigured() });
});

router.post('/test-mail', async (req, res) => {
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: '送信先アドレスを指定してください' });
  try {
    await sendMail({
      to,
      subject: '【テスト送信】営業支援システム',
      text: 'このメールはSMTP設定の動作確認用テストメールです。',
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
