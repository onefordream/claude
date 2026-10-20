const express = require('express');
const { db } = require('../db');

const router = express.Router();
const CHANNELS = ['email', 'dm', 'instagram_dm'];

router.get('/', (req, res) => {
  const { channel } = req.query;
  const rows = channel
    ? db.prepare('SELECT * FROM templates WHERE channel = ? ORDER BY updated_at DESC').all(channel)
    : db.prepare('SELECT * FROM templates ORDER BY updated_at DESC').all();
  res.json({ templates: rows });
});

router.post('/', (req, res) => {
  const { channel = 'email', name, subject = '', body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'name と body は必須です' });
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: '不正なchannelです' });
  const info = db
    .prepare('INSERT INTO templates (channel, name, subject, body) VALUES (?, ?, ?, ?)')
    .run(channel, name, subject, body);
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ template });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '見つかりません' });
  const { name = existing.name, subject = existing.subject, body = existing.body } = req.body || {};
  db.prepare(`UPDATE templates SET name=?, subject=?, body=?, updated_at=datetime('now') WHERE id=?`)
    .run(name, subject, body, req.params.id);
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  res.json({ template });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
