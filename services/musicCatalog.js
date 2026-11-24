const axios = require('axios');

async function getMusicCatalog(searchQuery = '') {
  try {
    const endpoint = searchQuery
      ? `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=25`
      : `https://api.deezer.com/chart/0/tracks?limit=25`;

    const { data } = await axios.get(endpoint);
    const tracks = data.data || [];

    const metas = tracks.map((track) => ({
      id: `dz_${track.id}`,
      type: 'music',
      name: `${track.title} - ${track.artist.name}`,
      poster: track.album.cover_xl || track.album.cover_big,
      posterShape: 'square',
      description: `Album: ${track.album.title} • Artis: ${track.artist.name}`
    }));

    return { metas };
  } catch (error) {
    console.error('Error catalog:', error.message);
    return { metas: [] };
  }
}

module.exports = { getMusicCatalog };