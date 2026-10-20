require('dotenv').config();
const path = require('path');
const express = require('express');
const { basicAuth } = require('./auth');

if (!process.env.ADMIN_PASSWORD) {
  console.error(
    '[FATAL] ADMIN_PASSWORD が設定されていません。.env に ADMIN_PASSWORD を設定してください（.env.example を参照）。'
  );
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(basicAuth);

app.use('/api/prospects', require('./routes/prospects'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api', require('./routes/activities'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`営業支援システム起動: http://localhost:${PORT}`);
});
