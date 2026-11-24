async function getCatalog(type, id, searchQuery) {
  try {
    const url = searchQuery
      ? `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=25`
      : `https://api.deezer.com/chart/0/tracks?limit=25`;

    const res = await fetch(url);
    const data = await res.json();
    const tracks = data.data || [];

    return tracks.map((t) => ({
      id: `dz_${t.id}`,
      type: "track",
      name: t.title,
      artist: t.artist?.name || "Unknown Artist",
      album: t.album?.title || "",
      duration: t.duration || 0,
      poster: t.album?.cover_xl || t.album?.cover_big || "",
      posterShape: "square",
      description: `${t.artist?.name || ""} • Album: ${t.album?.title || ""}`
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { getCatalog };