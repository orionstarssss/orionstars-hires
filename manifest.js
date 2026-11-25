module.exports = {
  id: "org.orionstars.bitchord-hires",
  version: "2.0.0",
  name: "OrionStars Hi-Res",
  description: "High Music, High Quality! Pipeline by @orionstars._",
  bitchordAuth: true,
  resources: ["search", "stream"],
  checkValidLossless: 0,
  allowDownloads: 1,
  settings: [
    {
      key: "quality",
      type: "select",
      default: "hires",
      options: [
        { label: "Hi-Res Lossless — FLAC above 1.3 Mbps (up to 24/192)", value: "hires" },
        { label: "Lossless — FLAC, CD quality", value: "lossless" },
        { label: "High — MP3/M4A 256 kbps and up", value: "high" }
      ]
    }
  ]
};