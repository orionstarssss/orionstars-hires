async function getCatalog(type, id, searchQuery) {
  try {
    const url = searchQuery
      ? `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      : `https://api.deezer.com/chart/0/tracks?limit=20`;

    const res = await fetch(url);
    const data = await res.json();
    const tracks = data.data || [];

    return tracks.map((t) => ({
      id: `dz:${t.id}`,
      title: t.title,
      artist: t.artist?.name || "Unknown Artist",
      album: t.album?.title || "",
      duration: t.duration || 0,
      artworkURL: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || "",
      format: "flac",
      audioQuality: "Hi-Res Lossless",
      source: "OrionStars Hi-Res"
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { getCatalog };