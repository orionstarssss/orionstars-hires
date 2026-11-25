const express = require("express");
const cors = require("cors");
const manifest = require("../manifest");
const { getCatalog } = require("../services/musicCatalog");
const { getMeta } = require("../services/musicMeta");
const { getStream } = require("../services/musicStream");

const app = express();
app.use(cors());

// Log semua request masuk agar terlihat jelas di Runtime Logs Vercel
app.use((req, res, next) => {
  console.log(`[BITCHORD REQ] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => res.redirect("/manifest.json"));
app.get("/manifest.json", (req, res) => res.json(manifest));

// Universal Search Handler (menangkap /search, /search/track/..., /search?q=..., dll)
app.get(/^\/search/, async (req, res) => {
  try {
    const pathPart = req.path.replace(/^\/search\/?(track|music|movie)?\/?/i, "").replace(/\.json$/i, "");
    const query = req.query.q || req.query.query || req.query.search || decodeURIComponent(pathPart || "");
    if (!query) return res.json({ metas: [], results: [] });

    const items = await getCatalog("track", "orion_search", String(query));
    res.json({ metas: items, results: items });
  } catch (err) {
    res.json({ metas: [], results: [] });
  }
});

// Universal Stream Handler (menangkap /stream/track/id.json, /stream?id=..., /stream?title=...&artist=..., dll)
app.get(/^\/stream/, async (req, res) => {
  try {
    const debugMode = req.query.debug === "1";
    const pathPart = req.path.replace(/^\/stream\/?(track|music|movie)?\/?/i, "").replace(/\.json$/i, "");
    
    // BitChord sering mengirim query ?title=...&artist=... atau ?q=... atau ID di path
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