const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me'
];

async function fetchFallbackAudio(query) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const { data: searchData } = await axios.get(searchUrl, { timeout: 5000 });
      const firstMatch = searchData.items?.[0];
      if (!firstMatch) continue;

      const videoId = firstMatch.url.split('v=')[1];
      const { data: streamData } = await axios.get(`${instance}/streams/${videoId}`, { timeout: 5000 });

      const bestAudio = (streamData.audioStreams || [])
        .sort((a, b) => b.bitrate - a.bitrate)[0];

      if (bestAudio && bestAudio.url) {
        return {
          url: bestAudio.url,
          bitrate: `${Math.round(bestAudio.bitrate / 1000)} kbps`,
          codec: bestAudio.codec || 'OPUS/M4A'
        };
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}

async function getMusicStream(id) {
  const streams = [];

  try {
    const cleanId = id.replace('dz_', '');
    const { data: track } = await axios.get(`https://api.deezer.com/track/${cleanId}`);
    if (!track || track.error) return { streams: [] };

    const trackLabel = `${track.title} - ${track.artist.name}`;

    // 1. Cek Database FLAC / Hi-Res Pribadi
    const dbPath = path.join(__dirname, '..', 'customTracks.json');
    if (fs.existsSync(dbPath)) {
      const customDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (customDb[id]) {
        streams.push({
          name: `💎 ${customDb[id].quality}`,
          title: `${trackLabel}\n🎧 Lossless Stereo • @orionstars._\n📦 Ukuran: ${customDb[id].size || 'Master'}`,
          url: customDb[id].url,
          behaviorHints: { notWebReady: false }
        });
      }
    }

    // 2. Fallback Otomatis Full-Track
    const fallback = await fetchFallbackAudio(trackLabel);
    if (fallback) {
      streams.push({
        name: `⚡ Auto Stream • ${fallback.bitrate}`,
        title: `${trackLabel}\n🔊 Codec: ${fallback.codec} • @orionstars._\n🌐 Auto-Resolved Stream`,
        url: fallback.url,
        behaviorHints: { notWebReady: false }
      });
    } else if (track.preview) {
      streams.push({
        name: '🎵 Preview 30s • MP3',
        title: `${trackLabel}\n⚠️ Mode Preview (Fallback sibuk)`,
        url: track.preview
      });
    }

    return { streams };
  } catch (error) {
    console.error('Stream Error:', error.message);
    return { streams: [] };
  }
}

module.exports = { getMusicStream };