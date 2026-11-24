module.exports = {
  id: 'org.orionstars.hires',
  version: '1.0.0',
  name: 'OrionStars Hi-Res Music',
  description: 'Addon streaming musik kustom dengan pipeline Hi-Res & Lossless',
  resources: ['catalog', 'meta', 'stream'],
  types: ['music', 'movie'],
  idPrefixes: ['dz_'],
  catalogs: [
    {
      type: 'music',
      id: 'top-tracks',
      name: 'Trending Tracks',
      extra: [{ name: 'search', isRequired: false }]
    }
  ]
};