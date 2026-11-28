const customTracks = require("../customTracks.json");

// Gateway Lossless aktif
const LOSSLESS_GATEWAYS = [
  "https://tracks.monochrome.tf/api",
  "https://dab.yeet.su/api"
];

// API Full-Track 320kbps dengan CDN terbuka (tidak mengunci IP & durasi penuh)
const FULL_AUDIO_APIS = [
  "https://saavn.dev/api",
  "https://jiosaavn-api-privatecvc2.vercel.app"
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
        return {
          url: streamUrl,
          format: "flac",
          audioQuality: "Hi-Res Lossless",
          name: "FLAC 24-bit • 192kHz",
          title: `${bestMatch.title} - ${bestMatch.performer?.name || bestMatch.artist?.name || ""}`
        };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function fetchFullTrackCDN(searchQuery) {
  for (const apiBase of FULL_AUDIO_APIS) {
    try {
      const res = await fetch(
        `${apiBase}/search/songs?query=${encodeURIComponent(searchQuery)}&limit=5`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) continue;

      const json = await res.json();
      const results = json?.data?.results || json?.results || [];
      const topSong = results[0];
      if (!topSong) continue;

      const downloads = topSong.downloadUrl || [];
      // Ambil kualitas tertinggi (320kbps)
      const bestFile =
        downloads.find((d) => d.quality === "320kbps") ||
        downloads[downloads.length - 1];

      const audioUrl = bestFile?.url || bestFile?.link;
      if (audioUrl) {
        return {
          url: audioUrl,
          format: "m4a",
          audioQuality: "High Quality 320kbps",
          name: "OrionStars Full Track • 320kbps",
          title: `${topSong.name || searchQuery}`
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
  let searchQuery = id.replace(/^(dz_|dz:|track_|pm_|os_|qb_)/, "");

  // 1. Ambil metadata judul & artis dari Deezer
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
      name: custom.quality || "FLAC 24-bit • 192kHz",
      title: custom.title || trackTitle || id,
      format: "flac",
      audioQuality: "Hi-Res Lossless",
      url: custom.url
    });
  }

  // 3. Prioritas Kedua: Lossless / Hi-Res Gateway
  const lossless = await fetchLosslessStream(searchQuery, isrc);
  if (lossless && lossless.url) {
    streams.push(lossless);
  }

  // 4. Prioritas Ketiga: Full-Track 320kbps Open CDN (durasi penuh, anti-403)
  if (streams.length === 0) {
    const fullTrack = await fetchFullTrackCDN(searchQuery);
    if (fullTrack && fullTrack.url) {
      streams.push(fullTrack);
    }
  }

  return streams;
}

module.exports = { getStream };
