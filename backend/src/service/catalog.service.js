const songModel = require("../models/songs.model");
const { searchAll } = require("./sources");

const MOODS = ["happy", "sad", "angry", "neutral"];

/**
 * Several phrasings per mood so repeat reads don't return the same rows.
 * One is picked per request and rotated.
 */
const MOOD_QUERIES = {
  happy: [
    "bhangra punjabi dance",
    "punjabi party songs",
    "punjabi upbeat hits",
    "punjabi wedding bhangra",
  ],
  sad: [
    "punjabi sad songs",
    "punjabi heartbreak",
    "sad punjabi ballad",
    "punjabi emotional songs",
  ],
  angry: [
    "punjabi rap desi hip hop",
    "punjabi drill",
    "punjabi trap",
    "punjabi diss track",
  ],
  neutral: [
    "punjabi acoustic",
    "punjabi chill",
    "punjabi soft songs",
    "punjabi unplugged",
  ],
};

/** Rows without a playable URL are dead weight; never count or serve them. */
const PLAYABLE = { audio: { $nin: [null, ""] } };

/* ------------------------------------------------------------------
   A small TTL cache so a burst of reads doesn't hammer the provider.
   ------------------------------------------------------------------ */

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
}

/* Each mood walks its own list, so reading "happy" twice gives a different
   set while the cache still hits once a variant comes round again. */
const rotation = new Map();

function queryFor(mood) {
  const list = MOOD_QUERIES[mood] || MOOD_QUERIES.neutral;
  const at = rotation.get(mood) || 0;
  rotation.set(mood, at + 1);
  return list[at % list.length];
}

/* ------------------------------------------------------------------
   Fetching
   ------------------------------------------------------------------ */

async function persist(tracks, mood) {
  await Promise.all(
    tracks.map((track) =>
      songModel
        .findOneAndUpdate(
          { title: track.title, artist: track.artist },
          { ...track, mood },
          { upsert: true, new: true }
        )
        .catch((err) => console.warn("[catalog] upsert failed:", err.message))
    )
  );
}

/** Tracks for one mood, live if the provider answers and cached either way. */
async function tracksForMood(mood, { limit = 25, fresh = false } = {}) {
  if (!MOODS.includes(mood)) throw new Error(`unknown mood: ${mood}`);

  const query = queryFor(mood);
  const key = `${mood}:${query}:${limit}`;

  if (!fresh) {
    const hit = cacheGet(key);
    if (hit) return { ...hit, cached: true };
  }

  const { tracks, source } = await searchAll({ query, limit });

  if (tracks.length) {
    const tagged = tracks.map((t) => ({ ...t, mood }));
    persist(tagged, mood); // fire and forget; the response shouldn't wait on Mongo
    const result = { tracks: tagged, source, query };
    cacheSet(key, result);
    return { ...result, cached: false };
  }

  // Every provider came up empty — serve whatever the library already holds.
  const stored = await songModel
    .find({ mood, ...PLAYABLE })
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  return { tracks: stored, source: stored.length ? "library" : null, query, cached: false };
}

/**
 * A blended playlist. The reader hands over the whole confidence
 * distribution, so a 70/20/10 read builds a playlist in those proportions
 * instead of pretending the top mood is the only one present.
 */
async function tracksForBlend(weights, { limit = 24, floor = 0.08 } = {}) {
  const parts = MOODS.map((mood) => ({ mood, weight: Number(weights[mood]) || 0 }))
    .filter((p) => p.weight >= floor)
    .sort((a, b) => b.weight - a.weight);

  if (parts.length === 0) return { tracks: [], source: null, blend: [] };
  if (parts.length === 1) {
    const single = await tracksForMood(parts[0].mood, { limit });
    return {
      ...single,
      blend: [{ mood: parts[0].mood, share: 1, count: single.tracks.length }],
    };
  }

  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  const pools = await Promise.all(
    parts.map((p) => tracksForMood(p.mood, { limit }).catch(() => ({ tracks: [] })))
  );

  // How many slots each mood earns, largest-remainder so the total is exact.
  const exact = parts.map((p) => (p.weight / total) * limit);
  const quotas = exact.map(Math.floor);
  let spare = limit - quotas.reduce((a, b) => a + b, 0);
  exact
    .map((value, i) => ({ i, rem: value - Math.floor(value) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (spare > 0) {
        quotas[i] += 1;
        spare -= 1;
      }
    });

  // Round-robin so the moods interleave rather than arriving in blocks.
  const cursors = parts.map(() => 0);
  const taken = parts.map(() => 0);
  const seen = new Set();
  const out = [];

  let progressing = true;
  while (out.length < limit && progressing) {
    progressing = false;
    for (let i = 0; i < parts.length; i += 1) {
      if (taken[i] >= quotas[i]) continue;
      const pool = pools[i].tracks || [];
      while (cursors[i] < pool.length) {
        const track = pool[cursors[i]];
        cursors[i] += 1;
        const id = `${track.title}::${track.artist}`.toLowerCase();
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ ...track, mood: parts[i].mood });
        taken[i] += 1;
        progressing = true;
        break;
      }
    }
  }

  return {
    tracks: out,
    source: pools.find((p) => p.source)?.source || null,
    blend: parts.map((p, i) => ({
      mood: p.mood,
      share: Number((p.weight / total).toFixed(3)),
      count: taken[i],
    })),
  };
}

module.exports = {
  MOODS,
  MOOD_QUERIES,
  PLAYABLE,
  tracksForMood,
  tracksForBlend,
};
