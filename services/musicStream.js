const customTracks = require("../customTracks.json");

// Daftar gateway Qobuz lossless/hi-res community API (rotasi otomatis jika salah satu down)
const QOBUZ_GATEWAYS = [
  "https://dab.yeet.su/api",
  "https://qobuz.squid.wtf/api"
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee"
];

function findCustomTrack(id, trackTitle, artistName) {
  if (customTracks[id]) return customTracks[id];
  const cleanTitle = (trackTitle || "").toLowerCase().trim();
  const cleanArtist = (artistName || "").toLowerCase().trim();

  if (cleanTitle && cleanArtist && customTracks[`${cleanTitle} - ${cleanArtist}`]) {
    return customTracks[`${cleanTitle} - ${cleanArtist}`];
  }
  if (cleanTitle && customTracks[cleanTitle]) {
    return customTracks[cleanTitle];
  }
  return null;
}

async function fetchQobuzStream(query, isrc) {
  for (const baseUrl of QOBUZ_GATEWAYS) {
    try {
      // 1. Cari track di Qobuz (prioritas pakai ISRC jika ada agar 100% akurat, fallback ke query judul)
      const searchParam = isrc || query;
      const searchRes = await fetch(
        `${baseUrl}/search?q=${encodeURIComponent(searchParam)}&type=track`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const tracks = searchData?.tracks?.items || searchData?.data || searchData?.results || [];
      const bestMatch = tracks[0];
      if (!bestMatch || !bestMatch.id) continue;

      // 2. Ambil direct stream URL FLAC (quality 27 = Hi-Res 24-bit/192kHz, 6 = CD Lossless 16-bit/44.1kHz)
      const streamRes = await fetch(
        `${baseUrl}/stream?trackId=${bestMatch.id}&quality=27`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (!streamRes.ok) continue;

      const streamData = await streamRes.json();
      const streamUrl = streamData?.url || streamData?.streamUrl || streamData?.data?.url;

      if (streamUrl) {
        const bitDepth = bestMatch.maximum_bit_depth || 24;
        const sampleRate = bestMatch.maximum_sampling_rate || 192;
        return {
          url: streamUrl,
          quality: `FLAC ${bitDepth}-bit • ${sampleRate}kHz`,
          title: `${bestMatch.title} - ${bestMatch.performer?.name || bestMatch.artist?.name || ""}`
        };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function getStream(type, id) {
  const streams = [];
  let trackTitle = "";
  let artistName = "";
  let isrc = "";
  let searchQuery = id.replace(/^(dz_|track_|pm_|os_|qb_)/, "");
  let deezerPreview = "";

  // 1. Ambil metadata & kode ISRC dari Deezer jika prefix dz_
  if (id.startsWith("dz_")) {
    const trackId = id.replace("dz_", "");
    try {
      const dzRes = await fetch(`https://api.deezer.com/track/${trackId}`);
      const dzData = await dzRes.json();
      if (dzData && dzData.title) {
        trackTitle = dzData.title;
        artistName = dzData.artist?.name || "";
        isrc = dzData.isrc || "";
        searchQuery = `${trackTitle} ${artistName}`.trim();
        deezerPreview = dzData.preview || "";
      }
    } catch (e) {}
  } else {
    trackTitle = searchQuery;
  }

  // 2. Prioritas Utama: Koleksi FLAC Pribadi di customTracks.json
  const custom = findCustomTrack(id, trackTitle, artistName);
  if (custom) {
    streams.push({
      name: `💎 ${custom.quality || "FLAC 24-bit • 192kHz"}`,
      title: `${custom.title || trackTitle || id}\n👤 @orionstars._ (Vault)\n📦 Ukuran: ${custom.size || "Lossless"}`,
      url: custom.url
    });
  }

  // 3. Prioritas Kedua: Otomatis Qobuz Lossless / Hi-Res Stream
  const qobuz = await fetchQobuzStream(searchQuery, isrc);
  if (qobuz && qobuz.url) {
    streams.push({
      name: `💠 Qobuz ${qobuz.quality}`,
      title: `${qobuz.title || searchQuery}\n👤 @orionstars._ • Qobuz Lossless Pipeline`,
      url: qobuz.url
    });
  }

  // 4. Fallback Ketiga: Piped Audio Stream
  for (const instance of PIPED_INSTANCES) {
    try {
      const searchRes = await fetch(
        `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`,
        { signal: AbortSignal.timeout(3000) }
      );
      const searchJson = await searchRes.json();
      const firstItem = searchJson?.items?.[0];

      if (firstItem && firstItem.url) {
        const videoId = firstItem.url.replace("/watch?v=", "");
        const streamRes = await fetch(`${instance}/streams/${videoId}`, {
          signal: AbortSignal.timeout(3000)
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

  // 5. Fallback Terakhir: Direct MP3 Deezer
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