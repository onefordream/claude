const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const byStage = db
    .prepare('SELECT stage, COUNT(*) as count FROM prospects GROUP BY stage')
    .all();
  const byChannel7d = db
    .prepare(`
      SELECT channel, COUNT(*) as count FROM activities
      WHERE occurred_at >= datetime('now', '-7 days')
      GROUP BY channel
    `)
    .all();
  const totals = db.prepare('SELECT COUNT(*) as count FROM prospects').get();
  const emailStats = db
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM email_sends
    `)
    .get();
  const recentActivities = db
    .prepare(`
      SELECT a.*, p.name as prospect_name
      FROM activities a JOIN prospects p ON p.id = a.prospect_id
      ORDER BY a.occurred_at DESC LIMIT 20
    `)
    .all();

  res.json({
    total_prospects: totals.count,
    by_stage: byStage,
    by_channel_7d: byChannel7d,
    email_stats: emailStats,
    recent_activities: recentActivities,
  });
});

module.exports = router;
