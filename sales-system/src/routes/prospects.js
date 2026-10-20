const express = require('express');
const { db } = require('../db');
const { parseCsvToObjects, objectsToCsv } = require('../util/csv');

const router = express.Router();

const STAGES = ['research', 'listed', 'contacted', 'replied', 'negotiating', 'won', 'lost', 'ng'];

const CSV_HEADERS = [
  'name', 'prefecture', 'city', 'address', 'phone', 'email', 'website',
  'instagram', 'source', 'stage', 'owner', 'tags', 'notes',
];

function sanitizeProspectInput(body) {
  const out = {};
  for (const key of CSV_HEADERS) {
    if (body[key] !== undefined) out[key] = String(body[key]).trim();
  }
  if (out.stage && !STAGES.includes(out.stage)) delete out.stage;
  return out;
}

router.get('/stages', (req, res) => {
  res.json({ stages: STAGES });
});

router.get('/', (req, res) => {
  const { stage, q, owner } = req.query;
  const clauses = [];
  const params = [];
  if (stage) {
    clauses.push('stage = ?');
    params.push(stage);
  }
  if (owner) {
    clauses.push('owner = ?');
    params.push(owner);
  }
  if (q) {
    clauses.push('(name LIKE ? OR city LIKE ? OR prefecture LIKE ? OR address LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM prospects ${where} ORDER BY updated_at DESC`)
    .all(...params);
  res.json({ prospects: rows });
});

router.get('/export', (req, res) => {
  const { stage } = req.query;
  const rows = stage
    ? db.prepare('SELECT * FROM prospects WHERE stage = ? ORDER BY id').all(stage)
    : db.prepare('SELECT * FROM prospects ORDER BY id').all();
  const csv = objectsToCsv(rows, ['id', 'created_at', 'updated_at', ...CSV_HEADERS]);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="prospects_${Date.now()}.csv"`);
  res.send('﻿' + csv);
});

router.post('/import', express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }), (req, res) => {
  let records;
  try {
    records = parseCsvToObjects(req.body || '');
  } catch (e) {
    return res.status(400).json({ error: 'CSVの解析に失敗しました: ' + e.message });
  }
  if (records.length === 0) {
    return res.status(400).json({ error: 'CSVにデータ行がありません' });
  }
  if (!('name' in records[0])) {
    return res.status(400).json({ error: 'name列が見つかりません' });
  }

  const insert = db.prepare(`
    INSERT INTO prospects (name, prefecture, city, address, phone, email, website, instagram, source, stage, owner, tags, notes)
    VALUES (@name, @prefecture, @city, @address, @phone, @email, @website, @instagram, @source, @stage, @owner, @tags, @notes)
  `);

  let imported = 0;
  let skipped = 0;
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      if (!r.name) {
        skipped++;
        continue;
      }
      const stage = STAGES.includes(r.stage) ? r.stage : 'research';
      insert.run({
        name: r.name || '',
        prefecture: r.prefecture || '',
        city: r.city || '',
        address: r.address || '',
        phone: r.phone || '',
        email: r.email || '',
        website: r.website || '',
        instagram: r.instagram || '',
        source: r.source || '',
        stage,
        owner: r.owner || '',
        tags: r.tags || '',
        notes: r.notes || '',
      });
      imported++;
    }
  });
  tx(records);

  res.json({ imported, skipped });
});

router.get('/:id', (req, res) => {
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).json({ error: '見つかりません' });
  const activities = db
    .prepare('SELECT * FROM activities WHERE prospect_id = ? ORDER BY occurred_at DESC')
    .all(req.params.id);
  const emailSends = db
    .prepare('SELECT * FROM email_sends WHERE prospect_id = ? ORDER BY id DESC')
    .all(req.params.id);
  res.json({ prospect, activities, emailSends });
});

router.post('/', (req, res) => {
  const data = sanitizeProspectInput(req.body || {});
  if (!data.name) return res.status(400).json({ error: '店舗名は必須です' });
  const info = db
    .prepare(`
      INSERT INTO prospects (name, prefecture, city, address, phone, email, website, instagram, source, stage, owner, tags, notes)
      VALUES (@name, @prefecture, @city, @address, @phone, @email, @website, @instagram, @source, @stage, @owner, @tags, @notes)
    `)
    .run({
      name: data.name,
      prefecture: data.prefecture || '',
      city: data.city || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      instagram: data.instagram || '',
      source: data.source || '',
      stage: data.stage || 'research',
      owner: data.owner || '',
      tags: data.tags || '',
      notes: data.notes || '',
    });
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ prospect });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '見つかりません' });
  const data = sanitizeProspectInput(req.body || {});
  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE prospects SET
      name=@name, prefecture=@prefecture, city=@city, address=@address, phone=@phone,
      email=@email, website=@website, instagram=@instagram, source=@source, stage=@stage,
      owner=@owner, tags=@tags, notes=@notes, updated_at=datetime('now')
    WHERE id=@id
  `).run({ ...merged, id: req.params.id });
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  res.json({ prospect });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM prospects WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
module.exports.STAGES = STAGES;
