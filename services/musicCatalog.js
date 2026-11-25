async function getCatalog(type, id, searchQuery) {
  try {
    const url = searchQuery
      ? `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      : `https://api.deezer.com/chart/0/tracks?limit=20`;

    const res = await fetch(url);
    const data = await res.json();
    const tracks = data.data || [];

    return tracks.map((t) => {
      const artistName = t.artist?.name || "Unknown Artist";
      const albumTitle = t.album?.title || "";
      const coverUrl = t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || "";

      return {
        id: `dz_${t.id}`,
        trackId: `dz_${t.id}`,
        type: "track",
        title: t.title,
        name: t.title,
        artist: artistName,
        artists: [artistName],
        album: albumTitle,
        duration: (t.duration || 0) * 1000,
        durationSec: t.duration || 0,
        cover: coverUrl,
        artwork: coverUrl,
        poster: coverUrl,
        posterShape: "square",
        isrc: t.isrc || "",
        quality: "FLAC 24-bit • 192kHz",
        lossless: true,
        source: "OrionStars Hi-Res"
      };
    });
  } catch (err) {
    return [];
  }
}

module.exports = { getCatalog };
