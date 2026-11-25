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