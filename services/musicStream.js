const customTracks = require("../customTracks.json");

// Gateway Lossless / Hi-Res aktif (Tidal/Monochrome & Qobuz proxy)
const LOSSLESS_GATEWAYS = [
  "https://tracks.monochrome.tf/api",
  "https://dab.yeet.su/api",
  "https://qobuz.squid.wtf/api"
];

// Daftar instance Invidious & Piped aktif untuk full-length audio fallback
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be"
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee"
];

function findCustomTrack(id, trackTitle, artistName) {
  if (customTracks[id]) return customTracks[id];
  const cleanTitle = (trackTitle || "").toLowerCase().trim();
  const cleanArtist = (artistName || "").toLowerCase().trim();

  if (cleanTitle && artistName && customTracks[`${cleanTitle} - ${cleanArtist}`]) {
    return customTracks[`${cleanTitle} - ${cleanArtist}`];
  }
  if (cleanTitle && customTracks[cleanTitle]) {
    return customTracks[cleanTitle];
  }
  return null;
}

async function fetchLosslessStream(query, isrc) {
  for (const baseUrl of LOSSLESS_GATEWAYS) {
    try {
      const searchParam = isrc || query;
      const searchRes = await fetch(
        `${baseUrl}/search?q=${encodeURIComponent(searchParam)}&type=track`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const tracks = searchData?.tracks?.items || searchData?.data || searchData?.results || [];
      const bestMatch = tracks[0];
      if (!bestMatch || !bestMatch.id) continue;

      const streamRes = await fetch(
        `${baseUrl}/stream?trackId=${bestMatch.id}&quality=27`,
        { signal: AbortSignal.timeout(4000) }
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

async function fetchFullAudioFallback(searchQuery) {
  // 1. Coba Invidious API (Full song audio stream)
  for (const host of INVIDIOUS_INSTANCES) {
    try {
      const sRes = await fetch(
        `${host}/api/v1/search?q=${encodeURIComponent(searchQuery + " audio")}&type=video`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (!sRes.ok) continue;
      const results = await sRes.json();
      const videoId = results?.[0]?.videoId;
      if (!videoId) continue;

      const vRes = await fetch(`${host}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!vRes.ok) continue;
      const vData = await vRes.json();

      const audioFormats = (vData.adaptiveFormats || [])
        .filter((f) => f.type && f.type.startsWith("audio/") && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats[0]?.url) {
        return {
          url: audioFormats[0].url,
          bitrate: Math.round((audioFormats[0].bitrate || 160000) / 1000),
          title: results[0].title || searchQuery
        };
      }
    } catch (e) {
      continue;
    }
  }

  // 2. Cadangan Piped API (Full song audio stream)
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
          return {
            url: bestAudio.url,
            bitrate: Math.round((bestAudio.bitrate || 128000) / 1000),
            title: firstItem.title || searchQuery
          };
        }
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
  let searchQuery = id.replace(/^(dz_|dz:|track_|pm_|os_|qb_)/, "");

  // 1. Ambil metadata judul lengkap, artis, & ISRC dari Deezer (tanpa mengambil preview 30 detik)
  if (id.startsWith("dz_") || id.startsWith("dz:")) {
    const trackId = id.replace(/^dz[_:]/, "");
    try {
      const dzRes = await fetch(`https://api.deezer.com/track/${trackId}`);
      const dzData = await dzRes.json();
      if (dzData && dzData.title) {
        trackTitle = dzData.title;
        artistName = dzData.artist?.name || "";
        isrc = dzData.isrc || "";
        searchQuery = `${trackTitle} ${artistName}`.trim();
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

  // 3. Prioritas Kedua: Otomatis Lossless / Hi-Res Stream
  const lossless = await fetchLosslessStream(searchQuery, isrc);
  if (lossless && lossless.url) {
    streams.push({
      name: `💠 ${lossless.quality}`,
      title: `${lossless.title || searchQuery}\n👤 @orionstars._ • Lossless Pipeline`,
      url: lossless.url
    });
  }

  // 4. Prioritas Ketiga: Full-Length Audio Stream (Invidious / Piped — full lagu, bukan 30 detik)
  if (streams.length === 0) {
    const fullAudio = await fetchFullAudioFallback(searchQuery);
    if (fullAudio && fullAudio.url) {
      streams.push({
        name: `⚡ OrionStars Full Audio • ${fullAudio.bitrate}kbps`,
        title: `${fullAudio.title}\n👤 @orionstars._ • Full Track`,
        url: fullAudio.url
      });
    }
  }

  return streams;
}

module.exports = { getStream };
