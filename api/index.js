const express = require("express");
const cors = require("cors");
const manifest = require("../manifest");
const { getCatalog } = require("../services/musicCatalog");
const { getMeta } = require("../services/musicMeta");
const { getStream } = require("../services/musicStream");

const app = express();
app.use(cors());

app.get("/", (req, res) => res.redirect("/manifest.json"));
app.get("/manifest.json", (req, res) => res.json(manifest));

// Endpoint Search khusus BitChord (/search/track/query.json)
app.get("/search/:type/:query.json", async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const metas = await getCatalog("track", "orion_search", query);
    res.json({ metas });
  } catch (err) {
    res.json({ metas: [] });
  }
});

// Endpoint Catalog (Trending & Search fallback)
app.get("/catalog/:type/:id/:extra?.json", async (req, res) => {
  try {
    const { type, id, extra } = req.params;
    let searchQuery = "";
    if (extra && extra.startsWith("search=")) {
      searchQuery = decodeURIComponent(extra.replace("search=", ""));
    }
    const metas = await getCatalog(type, id, searchQuery);
    res.json({ metas });
  } catch (err) {
    res.json({ metas: [] });
  }
});

// Endpoint Meta
app.get("/meta/:type/:id.json", async (req, res) => {
  try {
    const meta = await getMeta(req.params.type, req.params.id);
    res.json({ meta });
  } catch (err) {
    res.json({ meta: null });
  }
});

// Endpoint Stream
app.get("/stream/:type/:id.json", async (req, res) => {
  try {
    const streams = await getStream(req.params.type, req.params.id);
    res.json({ streams });
  } catch (err) {
    res.json({ streams: [] });
  }
});

module.exports = app;