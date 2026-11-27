const express = require("express");
const cors = require("cors");
const manifest = require("../manifest");
const { getCatalog } = require("../services/musicCatalog");
const { getStream } = require("../services/musicStream");

const app = express();
app.use(cors());

app.use((req, res, next) => {
  console.log(`[BITCHORD REQ] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => res.redirect("/manifest.json"));
app.get("/manifest.json", (req, res) => res.json(manifest));

// Search Handler persis skema Han Hi-Res / BitChord v1.10.1
app.get(/^\/search/, async (req, res) => {
  try {
    const query = req.query.q || req.query.query || "";
    if (!query) return res.json({ tracks: [] });

    const tracks = await getCatalog("track", "orion_search", String(query));
    res.json({ tracks });
  } catch (err) {
    res.json({ tracks: [] });
  }
});

// Stream Handler
app.get(/^\/stream/, async (req, res) => {
  try {
    const rawId = req.query.id || req.query.trackId || req.path.split("/").pop().replace(".json", "");
    const cleanId = decodeURIComponent(String(rawId)).replace(/^dz:/i, "dz_");
    const streams = await getStream("track", cleanId, false);
    const top = streams[0] || {};

    res.json({
      url: top.url || "",
      streamUrl: top.url || "",
      format: "flac",
      audioQuality: "Hi-Res Lossless",
      streams
    });
  } catch (err) {
    res.json({ streams: [] });
  }
});

module.exports = app;