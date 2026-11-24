module.exports = {
  id: "org.orionstars.hires",
  version: "1.1.0",
  name: "OrionStars Hi-Res Music",
  description: "Custom Hi-Res & Lossless music streaming addon pipeline by @orionstars._",
  contentType: "music",
  resources: ["search", "stream", "catalog", "meta"],
  types: ["track", "album", "artist", "playlist", "movie", "series"],
  idPrefixes: ["dz_"],
  catalogs: [
    {
      type: "track",
      id: "top-tracks",
      name: "OrionStars Trending"
    },
    {
      type: "track",
      id: "orion_search",
      name: "OrionStars Search",
      extra: [{ name: "search", isRequired: true }]
    }
  ]
};