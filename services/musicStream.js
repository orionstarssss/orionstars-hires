const customTracks = require("../customTracks.json");

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
  "https://pipedapi.drgns.space"
];

async function getStream(type, id) {
  const streams = [];

  // 1. Cek database custom FLAC/Hi-Res pribadi di customTracks.json
  if (customTracks[id]) {
    const custom = customTracks[id];
    streams.push({
      name: `💎 ${custom.quality || "FLAC 24-bit • 192kHz"}`,
      title: `${custom.title || id}\n👤 @orionstars._\n📦 Ukuran: ${custom.size || "Lossless"}`,
      url: custom.url
    });
  }

  // 2. Ambil metadata lagu dari Deezer jika prefix dz_
  let searchQuery = id.replace(/^(dz_|track_|pm_)/, "");
  let deezerPreview = "";

  if (id.startsWith("dz_")) {
    const trackId = id.replace("dz_", "");
    try {
      const dzRes = await fetch(`https://api.deezer.com/track/${trackId}`);
      const dzData = await dzRes.json();
      if (dzData && dzData.title) {
        searchQuery = `${dzData.title} ${dzData.artist?.name || ""}`.trim();
        deezerPreview = dzData.preview || "";
      }
    } catch (e) {}
  }

  // 3. Ambil audio stream dari beberapa instance Piped secara paralel
  for (const instance of PIPED_INSTANCES) {
    try {
      const searchRes = await fetch(
        `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`,
        { signal: AbortSignal.timeout(3500) }
      );
      const searchJson = await searchRes.json();
      const firstItem = searchJson?.items?.[0];

      if (firstItem && firstItem.url) {
        const videoId = firstItem.url.replace("/watch?v=", "");
        const streamRes = await fetch(`${instance}/streams/${videoId}`, {
          signal: AbortSignal.timeout(3500)
        });
        const streamJson = await streamRes.json();

        const bestAudio = (streamJson.audioStreams || [])
          .filter((a) => a.url && !a.videoOnly)
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (bestAudio && bestAudio.url) {
          streams.push({
            name: `⚡ OrionStars Stream • ${Math.round((bestAudio.bitrate || 128000) / 1000)}kbps`,
            title: `${firstItem.title}\n👤 @orionstars._ • ${bestAudio.codec || "Audio"}`,
            url: bestAudio.url
          });
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // 4. Fallback Direct MP3 jika semua server Piped sedang sibuk
  if (deezerPreview) {
    streams.push({
      name: "🎵 Direct Audio • MP3",
      title: `${searchQuery}\n👤 @orionstars._ (Fallback Direct)`,
      url: deezerPreview
    });
  }

  return streams;
}

module.exports = { getStream };