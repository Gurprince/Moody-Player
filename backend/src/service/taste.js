/**
 * What a search is made of: a language, optionally a genre, and a mood —
 * either one of the four the camera can read, or whatever word someone typed
 * to describe how they feel.
 */

const MOODS = ["happy", "sad", "angry", "neutral"];

/*
 * `term` goes into the search text and `market` picks the storefront. `hints`
 * are the genre names the provider actually reports for that language — the
 * search is relevance-ranked rather than filtered, so a few foreign results
 * always slip in; matching on the reported genre pushes them down the list.
 */
const LANGUAGES = {
  punjabi: {
    label: "Punjabi",
    term: "punjabi",
    market: "IN",
    hints: ["punjabi", "bhangra", "indian", "worldwide"],
  },
  hindi: {
    label: "Hindi",
    term: "bollywood",
    market: "IN",
    hints: ["bollywood", "hindi", "indian"],
  },
  english: { label: "English", term: "", market: "US", hints: [] },
  tamil: { label: "Tamil", term: "tamil", market: "IN", hints: ["tamil", "indian"] },
  telugu: {
    label: "Telugu",
    term: "telugu",
    market: "IN",
    hints: ["telugu", "indian"],
  },
  bengali: {
    label: "Bengali",
    term: "bengali",
    market: "IN",
    hints: ["bengali", "indian"],
  },
  spanish: {
    label: "Spanish",
    term: "latino",
    market: "ES",
    hints: ["latino", "latina", "espa", "reggaeton", "urbano"],
  },
  // the KR storefront answers nothing at all; US carries the same catalogue
  korean: { label: "Korean", term: "k-pop", market: "US", hints: ["k-pop", "korean"] },
  japanese: {
    label: "Japanese",
    term: "j-pop",
    market: "JP",
    hints: ["j-pop", "japanese", "anime"],
  },
  arabic: {
    label: "Arabic",
    term: "arabic",
    market: "SA",
    hints: ["arabic", "arab", "khaleeji"],
  },
};

/**
 * Keeps a result set in the language that was asked for. Nothing is thrown
 * away — rows the provider tagged with a matching genre simply lead.
 */
function preferLanguage(tracks, language) {
  const hints = LANGUAGES[language]?.hints || [];
  if (!hints.length || !tracks.length) return { tracks, onLanguage: tracks.length };

  const matches = (track) => {
    const genre = (track.genre || "").toLowerCase();
    return hints.some((h) => genre.includes(h));
  };

  const lead = tracks.filter(matches);
  const rest = tracks.filter((t) => !matches(t));
  return { tracks: [...lead, ...rest], onLanguage: lead.length };
}

const GENRES = {
  any: { label: "Any", term: "" },
  pop: { label: "Pop", term: "pop" },
  hiphop: { label: "Hip hop", term: "rap" },
  rock: { label: "Rock", term: "rock" },
  electronic: { label: "Electronic", term: "electronic" },
  acoustic: { label: "Acoustic", term: "acoustic" },
  folk: { label: "Folk", term: "folk" },
  rnb: { label: "R&B", term: "soul" },
  indie: { label: "Indie", term: "indie" },
  classical: { label: "Classical", term: "classical" },
};

/* One word each. Relevance drifts off-language as a query gets longer, so
   the mood is a single term and phrasings rotate instead of stacking. */
const MOOD_TERMS = {
  happy: ["upbeat", "party", "joyful", "dance"],
  sad: ["sad", "heartbreak", "emotional", "melancholy"],
  angry: ["aggressive", "intense", "hard", "diss"],
  neutral: ["chill", "mellow", "relaxing", "slow"],
};

/**
 * Words people actually reach for, mapped onto the four moods the rest of the
 * system speaks. A word that isn't here still shapes the search — it just
 * doesn't claim to know which mood it is.
 */
const FEELINGS = {
  // happy
  happy: { happy: 1 },
  joyful: { happy: 1 },
  excited: { happy: 1 },
  ecstatic: { happy: 1 },
  celebrating: { happy: 1 },
  cheerful: { happy: 1 },
  hyped: { happy: 0.8, angry: 0.2 },
  playful: { happy: 0.85, neutral: 0.15 },
  grateful: { happy: 0.7, neutral: 0.3 },
  hopeful: { happy: 0.6, neutral: 0.4 },
  romantic: { happy: 0.6, sad: 0.4 },
  loved: { happy: 0.75, neutral: 0.25 },

  // sad
  sad: { sad: 1 },
  heartbroken: { sad: 1 },
  lonely: { sad: 0.85, neutral: 0.15 },
  homesick: { sad: 0.7, neutral: 0.3 },
  nostalgic: { sad: 0.55, neutral: 0.45 },
  wistful: { sad: 0.6, neutral: 0.4 },
  grieving: { sad: 1 },
  disappointed: { sad: 0.7, angry: 0.3 },
  tired: { sad: 0.4, neutral: 0.6 },
  drained: { sad: 0.5, neutral: 0.5 },
  low: { sad: 0.8, neutral: 0.2 },
  missing: { sad: 0.8, neutral: 0.2 },

  // angry
  angry: { angry: 1 },
  furious: { angry: 1 },
  frustrated: { angry: 0.8, sad: 0.2 },
  annoyed: { angry: 0.75, neutral: 0.25 },
  restless: { angry: 0.4, happy: 0.3, neutral: 0.3 },
  motivated: { angry: 0.5, happy: 0.5 },
  determined: { angry: 0.45, neutral: 0.55 },
  petty: { angry: 0.7, happy: 0.3 },
  betrayed: { angry: 0.6, sad: 0.4 },
  stressed: { angry: 0.5, sad: 0.3, neutral: 0.2 },
  anxious: { sad: 0.45, angry: 0.3, neutral: 0.25 },

  // neutral
  neutral: { neutral: 1 },
  calm: { neutral: 1 },
  chill: { neutral: 1 },
  focused: { neutral: 0.85, angry: 0.15 },
  studying: { neutral: 1 },
  working: { neutral: 0.9, happy: 0.1 },
  sleepy: { neutral: 0.7, sad: 0.3 },
  content: { neutral: 0.6, happy: 0.4 },
  bored: { neutral: 0.7, sad: 0.3 },
  thoughtful: { neutral: 0.7, sad: 0.3 },
  peaceful: { neutral: 1 },
};

/** A few suggestions for the interface to offer as a starting point. */
const FEELING_HINTS = [
  "nostalgic",
  "hyped",
  "heartbroken",
  "focused",
  "restless",
  "romantic",
];

const normalise = (weights) => {
  const total = MOODS.reduce((sum, m) => sum + (weights[m] || 0), 0);
  if (!total) return null;
  return Object.fromEntries(MOODS.map((m) => [m, (weights[m] || 0) / total]));
};

/**
 * Turns "a bit nostalgic honestly" into mood weights plus the words worth
 * searching on. Unknown words are kept for the search and reported as
 * unmatched, so the interface can be honest about what it did.
 */
function readFeeling(text) {
  const clean = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s'&-]/g, " ")
    .trim();
  if (!clean) return null;

  const words = clean.split(/\s+/).filter((w) => w.length > 2).slice(0, 6);
  const totals = Object.fromEntries(MOODS.map((m) => [m, 0]));
  const matched = [];

  for (const word of words) {
    const hit =
      FEELINGS[word] ||
      FEELINGS[word.replace(/(ing|ed|ly)$/, "")] ||
      null;
    if (!hit) continue;
    matched.push(word);
    for (const mood of MOODS) totals[mood] += hit[mood] || 0;
  }

  return {
    text: clean.slice(0, 60),
    words,
    matched,
    weights: normalise(totals),
  };
}

/**
 * The provider matches all the words, so a specific combination can come back
 * empty. Build a ladder from most specific to least and let the caller walk
 * it — the language term is never dropped, so the result is always in the
 * language that was asked for.
 */
function buildQueries({ mood, language, genre, feeling, variant = 0 }) {
  const lang = LANGUAGES[language] || LANGUAGES.punjabi;
  const gen = GENRES[genre] || GENRES.any;

  const terms = MOOD_TERMS[mood] || MOOD_TERMS.neutral;
  // A typed feeling replaces the canned mood words with the person's own.
  const moodWords = feeling?.words?.length
    ? feeling.words.join(" ")
    : terms[variant % terms.length];

  /* Shortest useful phrasings first: two tokens keeps the provider on the
     requested language, three starts pulling in whatever matches loudest. */
  const ladder = gen.term
    ? [
        [lang.term, gen.term, moodWords],
        [lang.term, gen.term],
        [lang.term, moodWords],
        [lang.term || moodWords],
      ]
    : [
        [lang.term, moodWords],
        [lang.term || moodWords],
      ];

  const seen = new Set();
  const queries = [];
  for (const parts of ladder) {
    const query = parts.filter(Boolean).join(" ").trim();
    if (query && !seen.has(query)) {
      seen.add(query);
      queries.push(query);
    }
  }
  return { queries, market: lang.market };
}

const languageList = () =>
  Object.entries(LANGUAGES).map(([id, l]) => ({ id, label: l.label }));

const genreList = () =>
  Object.entries(GENRES).map(([id, g]) => ({ id, label: g.label }));

module.exports = {
  MOODS,
  LANGUAGES,
  GENRES,
  MOOD_TERMS,
  FEELING_HINTS,
  readFeeling,
  preferLanguage,
  buildQueries,
  languageList,
  genreList,
};
