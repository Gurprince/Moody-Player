const axios = require("axios");

/**
 * Deezer — kept as a secondary source. It answers 200 but returns an empty
 * result set from some regions (it reports a `total` while withholding rows),
 * so it sits behind iTunes and simply yields nothing when that happens.
 */

const ENDPOINT = "https://api.deezer.com/search";

async function search({ query, limit = 25 }) {
  const { data } = await axios.get(ENDPOINT, {
    params: { q: query, limit },
    timeout: 9000,
  });

  return (data?.data || [])
    .filter((row) => row.preview && row.title)
    .map((row) => ({
      title: row.title,
      artist: row.artist?.name || "Unknown",
      audio: row.preview,
      songCover: row.album?.cover_big || row.album?.cover_medium || "",
      durationMs: (row.duration || 30) * 1000,
      genre: "",
      source: "deezer",
      sourceId: String(row.id),
      preview: true,
    }));
}

module.exports = { name: "deezer", search };
