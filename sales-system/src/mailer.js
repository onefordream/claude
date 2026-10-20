const nodemailer = require('nodemailer');
const { getSettings } = require('./db');

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'mail_from'];

// SMTP settings can be configured later from the Settings screen (stored in
// the DB) or via environment variables. DB settings take priority so the
// admin UI can override env defaults without a redeploy.
function getMailConfig() {
  const s = getSettings(SMTP_KEYS);
  return {
    host: s.smtp_host || process.env.SMTP_HOST || '',
    port: Number(s.smtp_port || process.env.SMTP_PORT || 587),
    secure: (s.smtp_secure || process.env.SMTP_SECURE || 'false') === 'true',
    user: s.smtp_user || process.env.SMTP_USER || '',
    pass: s.smtp_pass || process.env.SMTP_PASS || '',
    from: s.mail_from || process.env.MAIL_FROM || s.smtp_user || process.env.SMTP_USER || '',
  };
}

function isMailConfigured() {
  const c = getMailConfig();
  return Boolean(c.host && c.user && c.pass && c.from);
}

function createTransport() {
  const c = getMailConfig();
  if (!c.host || !c.user || !c.pass) {
    throw new Error('SMTP設定が未完了です。設定画面でメール送信情報を入力してください。');
  }
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
  });
}

async function sendMail({ to, subject, text }) {
  const c = getMailConfig();
  const transport = createTransport();
  await transport.sendMail({
    from: c.from,
    to,
    subject,
    text,
  });
}

module.exports = { getMailConfig, isMailConfigured, createTransport, sendMail, SMTP_KEYS };
