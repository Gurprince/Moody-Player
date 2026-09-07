const axios = require("axios");

/**
 * iTunes Search — no key, no quota headaches, and its Punjabi catalogue is
 * accurate when the storefront is pinned to India. Previews are 30 seconds;
 * tracks uploaded through /songs play in full.
 */

const ENDPOINT = "https://itunes.apple.com/search";

/** Artwork comes back at 100px; the same URL serves any size. */
function bigArtwork(url) {
  return url ? url.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1") : "";
}

async function search({ query, limit = 25, market = "IN" }) {
  const { data } = await axios.get(ENDPOINT, {
    params: {
      term: query,
      media: "music",
      entity: "song",
      limit,
      country: market,
    },
    timeout: 9000,
  });

  return (data?.results || [])
    .filter((row) => row.previewUrl && row.trackName)
    .map((row) => ({
      title: row.trackName,
      artist: row.artistName || "Unknown",
      audio: row.previewUrl,
      songCover: bigArtwork(row.artworkUrl100),
      durationMs: row.trackTimeMillis || 30000,
      genre: row.primaryGenreName || "",
      source: "itunes",
      sourceId: String(row.trackId),
      preview: true,
    }));
}

module.exports = { name: "itunes", search };
