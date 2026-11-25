const express = require("express");
const cors = require("cors");
const manifest = require("../manifest");
const { getCatalog } = require("../services/musicCatalog");
const { getMeta } = require("../services/musicMeta");
const { getStream } = require("../services/musicStream");

const app = express();
app.use(cors());

// Log semua request masuk
app.use((req, res, next) => {
  console.log(`[BITCHORD REQ] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => res.redirect("/manifest.json"));
app.get("/manifest.json", (req, res) => res.json(manifest));

// Universal Search Handler untuk BitChord v1.10.1
app.get(/^\/search/, async (req, res) => {
  try {
    const pathPart = req.path.replace(/^\/search\/?(track|music|movie)?\/?/i, "").replace(/\.json$/i, "");
    const query = req.query.q || req.query.query || req.query.search || decodeURIComponent(pathPart || "");
    if (!query) return res.json({ results: [], tracks: [], items: [], metas: [] });

    const items = await getCatalog("track", "orion_search", String(query));
    res.json({
      results: items,
      tracks: items,
      items: items,
      metas: items
    });
  } catch (err) {
    res.json({ results: [], tracks: [], items: [], metas: [] });
  }
});

// Universal Stream Handler untuk BitChord v1.10.1
app.get(/^\/stream/, async (req, res) => {
  try {
    const debugMode = req.query.debug === "1";
    const pathPart = req.path.replace(/^\/stream\/?(track|music|movie)?\/?/i, "").replace(/\.json$/i, "");
    const queryTitle = req.query.title && req.query.artist
      ? `${req.query.title} ${req.query.artist}`
      : (req.query.q || req.query.title || req.query.id || decodeURIComponent(pathPart || ""));

    const result = await getStream("track", String(queryTitle), debugMode);
    if (debugMode) return res.json(result);
    res.json({ streams: result });
  } catch (err) {
    res.json({ streams: [] });
  }
});

// Endpoint Catalog & Meta (cadangan)
app.get("/catalog/:type/:id.json", async (req, res) => {
  const metas = await getCatalog(req.params.type, req.params.id, "");
  res.json({ metas });
});

app.get("/meta/:type/:id.json", async (req, res) => {
  const meta = await getMeta(req.params.type, req.params.id);
  res.json({ meta });
});

module.exports = app;
