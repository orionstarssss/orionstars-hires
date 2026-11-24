const axios = require('axios');

async function getMusicMeta(id) {
  try {
    const cleanId = id.replace('dz_', '');
    const { data: track } = await axios.get(`https://api.deezer.com/track/${cleanId}`);

    if (!track || track.error) return { meta: null };

    return {
      meta: {
        id: `dz_${track.id}`,
        type: 'music',
        name: track.title,
        poster: track.album.cover_xl || track.album.cover_big,
        posterShape: 'square',
        background: track.artist.picture_xl || track.album.cover_xl,
        releaseInfo: track.release_date ? track.release_date.split('-')[0] : '',
        description: `Artis: ${track.artist.name}\nAlbum: ${track.album.title}\nDurasi: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
      }
    };
  } catch (error) {
    console.error('Error meta:', error.message);
    return { meta: null };
  }
}

module.exports = { getMusicMeta };