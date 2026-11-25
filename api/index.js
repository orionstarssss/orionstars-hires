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

// Search Handler: Langsung menyertakan stream URL aktif di item hasil pencarian
app.get(/^\/search/, async (req, res) => {
  try {
    const query = req.query.q || req.query.query || "";
    if (!query) return res.json({ results: [], tracks: [], items: [] });

    const items = await getCatalog("track", "orion_search", String(query));
    if (items.length === 0) return res.json({ results: [], tracks: [], items: [] });

    // Ambil stream audio langsung untuk lagu teratas agar BitChord langsung bisa memutarnya
    const topStreams = await getStream("track", items[0].id, false);
    const bestAudioUrl = topStreams[0]?.url || "";

    const enrichedItems = items.map((item, idx) => ({
      ...item,
      url: idx === 0 ? bestAudioUrl : "",
      streamUrl: idx === 0 ? bestAudioUrl : "",
      audioUrl: idx === 0 ? bestAudioUrl : "",
      codec: topStreams[0]?.name?.includes("FLAC") ? "FLAC" : "MP3",
      bitrate: topStreams[0]?.name?.includes("FLAC") ? 1411 : 320
    }));

    // Kembalikan dalam format array & object agar terbaca oleh parser BitChord
    res.json({
      results: enrichedItems,
      tracks: enrichedItems,
      items: enrichedItems
    });
  } catch (err) {
    res.json({ results: [], tracks: [], items: [] });
  }
});

// Cadangan jika sewaktu-waktu BitChord memanggil /stream
app.get(/^\/stream/, async (req, res) => {
  try {
    const id = req.query.id || req.query.q || req.path.split("/").pop().replace(".json", "");
    const streams = await getStream("track", String(id), false);
    res.json({ streams });
  } catch (err) {
    res.json({ streams: [] });
  }
});

module.exports = app;