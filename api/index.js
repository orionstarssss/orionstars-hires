const express = require('express');
const cors = require('cors');
const manifest = require('../manifest');
const { getMusicCatalog } = require('../services/musicCatalog');
const { getMusicMeta } = require('../services/musicMeta');
const { getMusicStream } = require('../services/musicStream');

const app = express();
app.use(cors());

app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

app.get('/catalog/:type/:id.json', async (req, res) => {
  const data = await getMusicCatalog();
  res.json(data);
});

app.get('/catalog/:type/:id/:extra.json', async (req, res) => {
  const extraParams = new URLSearchParams(req.params.extra);
  const searchQuery = extraParams.get('search') || '';
  const data = await getMusicCatalog(searchQuery);
  res.json(data);
});

app.get('/meta/:type/:id.json', async (req, res) => {
  const data = await getMusicMeta(req.params.id);
  res.json(data);
});

app.get('/stream/:type/:id.json', async (req, res) => {
  const data = await getMusicStream(req.params.id);
  res.json(data);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`OrionStars Hi-Res aktif di http://localhost:${PORT}/manifest.json`);
  });
}

module.exports = app;