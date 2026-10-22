const express = require('express');
const { db } = require('../db');
const { searchPlaces } = require('../googlePlaces');

const router = express.Router();

router.get('/search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.status(400).json({ error: '検索キーワードを入力してください' });
  try {
    const results = await searchPlaces(query);
    res.json({ results });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/import', (req, res) => {
  const { places } = req.body || {};
  if (!Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: 'インポートする候補がありません' });
  }

  const insert = db.prepare(`
    INSERT INTO prospects (name, address, phone, website, source, stage)
    VALUES (@name, @address, @phone, @website, 'Google Places API', 'research')
  `);

  let imported = 0;
  let skipped = 0;
  const tx = db.transaction((rows) => {
    for (const p of rows) {
      if (!p || !p.name) { skipped++; continue; }
      insert.run({
        name: p.name,
        address: p.address || '',
        phone: p.phone || '',
        website: p.website || '',
      });
      imported++;
    }
  });
  tx(places);

  res.json({ imported, skipped });
});

module.exports = router;
