const itunes = require("./itunes");
const deezer = require("./deezer");

/**
 * Sources are tried in order until one answers with tracks. Adding or
 * reordering a provider is a one-line change here — the previous version
 * hard-coded a single endpoint, and when that endpoint died the whole
 * catalogue went with it.
 */
const SOURCES = [itunes, deezer];

/** Remembers how each provider last behaved, for /health. */
const health = new Map(
  SOURCES.map((s) => [s.name, { name: s.name, ok: null, ms: null, at: null, error: null }])
);

async function searchAll({ query, limit, market }) {
  for (const source of SOURCES) {
    const started = Date.now();
    try {
      const tracks = await source.search({ query, limit, market });
      health.set(source.name, {
        name: source.name,
        ok: tracks.length > 0,
        ms: Date.now() - started,
        at: new Date().toISOString(),
        error: tracks.length ? null : "answered with no tracks",
      });
      if (tracks.length) return { tracks, source: source.name };
    } catch (err) {
      health.set(source.name, {
        name: source.name,
        ok: false,
        ms: Date.now() - started,
        at: new Date().toISOString(),
        error: err.message,
      });
      console.warn(`[source:${source.name}] ${err.message}`);
    }
  }
  return { tracks: [], source: null };
}

const sourceHealth = () => [...health.values()];

module.exports = { searchAll, sourceHealth, SOURCES };
