const songModel = require("../models/songs.model");
const { searchAll } = require("./sources");
const {
  MOODS,
  LANGUAGES,
  GENRES,
  buildQueries,
  preferLanguage,
} = require("./taste");

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
  if (cache.size > 300) cache.delete(cache.keys().next().value);
}

/* Each mood walks its own list of phrasings, so reading the same mood twice
   gives a different set while the cache still hits once a variant comes
   round again. A typed feeling uses the person's own words, so it doesn't
   rotate at all. */
const rotation = new Map();

function nextVariant(key) {
  const at = rotation.get(key) || 0;
  rotation.set(key, at + 1);
  return at;
}

/* ------------------------------------------------------------------
   Fetching
   ------------------------------------------------------------------ */

function persist(tracks, mood, language) {
  return Promise.all(
    tracks.map((track) =>
      songModel
        .findOneAndUpdate(
          { title: track.title, artist: track.artist },
          { ...track, mood, language },
          { upsert: true, new: true }
        )
        .catch((err) => console.warn("[catalog] upsert failed:", err.message))
    )
  );
}

/**
 * Tracks for one mood in one language, live if a provider answers and served
 * from the stored library when none do.
 */
async function tracksForMood(
  mood,
  { limit = 25, language = "punjabi", genre = "any", feeling = null } = {}
) {
  if (!MOODS.includes(mood)) throw new Error(`unknown mood: ${mood}`);
  const lang = LANGUAGES[language] ? language : "punjabi";
  const gen = GENRES[genre] ? genre : "any";

  const rotationKey = `${mood}:${lang}:${gen}`;
  const variant = feeling ? 0 : nextVariant(rotationKey);
  const { queries, market } = buildQueries({
    mood,
    language: lang,
    genre: gen,
    feeling,
    variant,
  });

  const key = `${queries[0]}:${market}:${limit}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, cached: true };

  // Walk the ladder: the first phrasing the provider can actually match wins.
  for (const query of queries) {
    const { tracks, source } = await searchAll({ query, limit, market });
    if (!tracks.length) continue;

    const tagged = tracks.map((t) => ({ ...t, mood, language: lang }));
    persist(tagged, mood, lang); // fire and forget; the response shouldn't wait

    const sorted = preferLanguage(tagged, lang);
    const result = {
      tracks: sorted.tracks,
      onLanguage: sorted.onLanguage,
      source,
      query,
      language: lang,
      genre: gen,
      loosened: query !== queries[0],
    };
    cacheSet(key, result);
    return { ...result, cached: false };
  }

  /* Nothing answered. Fall back to the library — but only to rows in the
     language that was asked for, so a request for Korean never comes back
     with Punjabi. */
  const stored = await songModel
    .find({ mood, language: lang, ...PLAYABLE })
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  return {
    tracks: stored,
    source: stored.length ? "library" : null,
    query: queries[0],
    language: lang,
    genre: gen,
    cached: false,
  };
}

/**
 * A blended playlist. The reader hands over the whole confidence
 * distribution, so a 70/20/10 read builds a playlist in those proportions
 * instead of pretending the top mood is the only one present.
 */
async function tracksForBlend(weights, options = {}) {
  const { limit = 24, floor = 0.08 } = options;
  const parts = MOODS.map((mood) => ({ mood, weight: Number(weights[mood]) || 0 }))
    .filter((p) => p.weight >= floor)
    .sort((a, b) => b.weight - a.weight);

  if (parts.length === 0) return { tracks: [], source: null, blend: [] };
  if (parts.length === 1) {
    const single = await tracksForMood(parts[0].mood, { ...options, limit });
    return {
      ...single,
      blend: [{ mood: parts[0].mood, share: 1, count: single.tracks.length }],
    };
  }

  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  const pools = await Promise.all(
    parts.map((p) =>
      tracksForMood(p.mood, { ...options, limit }).catch(() => ({ tracks: [] }))
    )
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
    language: pools[0]?.language,
    genre: pools[0]?.genre,
    blend: parts.map((p, i) => ({
      mood: p.mood,
      share: Number((p.weight / total).toFixed(3)),
      count: taken[i],
    })),
  };
}

module.exports = { MOODS, PLAYABLE, tracksForMood, tracksForBlend };
