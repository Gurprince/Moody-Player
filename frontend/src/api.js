import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * An anonymous per-browser id. It lets the server learn what you skip and
 * save without anyone having to make an account.
 */
export function clientId() {
  try {
    let id = window.localStorage.getItem("mp:client");
    if (!id) {
      id =
        window.crypto?.randomUUID?.() ||
        `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem("mp:client", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: true, // carries the httpOnly session cookie
});

client.interceptors.request.use((config) => {
  config.headers["X-Client-Id"] = clientId();
  return config;
});

export const MOODS = ["happy", "sad", "angry", "neutral"];

export const MOOD_COPY = {
  happy: { line: "Loud and upbeat, for when the volume should go up." },
  sad: { line: "Slow and heavy, for when the room has gone quiet." },
  angry: { line: "Sharp and hard, with its teeth out." },
  neutral: { line: "An even mix that doesn't push you either way." },
};

/** A track's id — library rows have one, provider results don't. */
export const trackKey = (track) =>
  track?._id || track?.audio || `${track?.title}::${track?.artist}`;

/** Human summary of a blend: "mostly neutral, some happy". */
export function describeBlend(blend) {
  if (!blend || blend.length === 0) return "";
  if (blend.length === 1) return `all ${blend[0].mood}`;
  const [lead, ...rest] = blend;
  const tail = rest.map((p) => `${Math.round(p.share * 100)}% ${p.mood}`);
  return `${Math.round(lead.share * 100)}% ${lead.mood}, ${tail.join(", ")}`;
}

/**
 * Tracks for a reading. Pass the full score distribution and the server
 * builds a blended playlist; pass a single mood for the plain version. A
 * typed `feeling` overrides both — the words become the search.
 */
export async function fetchMoodSongs(mood, scores, taste = {}) {
  const params = { limit: 24 };
  if (scores) {
    const blend = MOODS.filter((m) => (scores[m] || 0) >= 0.08)
      .map((m) => `${m}:${scores[m].toFixed(3)}`)
      .join(",");
    if (blend) params.blend = blend;
  }
  if (!params.blend) params.mood = mood;
  if (taste.language) params.lang = taste.language;
  if (taste.genre && taste.genre !== "any") params.genre = taste.genre;
  if (taste.feeling) params.feeling = taste.feeling;

  const { data } = await client.get("/songs", { params });
  return {
    songs: Array.isArray(data.songs) ? data.songs : [],
    // typed words decide their own mood, so the server's answer wins
    mood: data.mood || null,
    blend: data.blend || null,
    language: data.language || null,
    genre: data.genre || null,
    feeling: data.feeling || null,
    source: data.source || null,
    personalised: Boolean(data.personalised),
  };
}

/** The languages, genres and feeling words the server can work with. */
export async function fetchOptions() {
  const { data } = await client.get("/options");
  return {
    languages: data.languages || [],
    genres: data.genres || [],
    feelings: data.feelings || [],
  };
}

export function pushPrefs(prefs) {
  return client.put("/me/prefs", prefs);
}

export async function fetchLibrary({ q = "", mood = "", lang = "", page = 1 } = {}) {
  const { data } = await client.get("/library", {
    params: { q, mood, lang, page },
  });
  return {
    songs: Array.isArray(data.songs) ? data.songs : [],
    total: data.total || 0,
    hasMore: Boolean(data.hasMore),
  };
}

export async function fetchMoodCounts() {
  const { data } = await client.get("/moods");
  return data.moods || {};
}

/** Fire-and-forget: the interface should never wait on a signal. */
export function sendSignal({ title, artist, mood, signal }) {
  if (!title) return;
  client
    .post("/feedback", { title, artist, mood, signal })
    .catch(() => {
      /* a lost signal is not worth interrupting anyone over */
    });
}

export function readError(err, fallback) {
  return err?.response?.data?.message || fallback;
}

/* ------------------------------------------------------------------
   Accounts
   ------------------------------------------------------------------ */

/** Who is signed in, plus their synced bookmarks and journal. */
export async function fetchMe() {
  const { data } = await client.get("/auth/me");
  return data;
}

/**
 * Register or sign in, handing over whatever this browser collected while
 * signed out so none of it is lost.
 */
export async function authenticate(mode, { email, password, saved, readings }) {
  const { data } = await client.post(`/auth/${mode}`, {
    email,
    password,
    saved,
    readings,
  });
  return data;
}

export async function signOut() {
  await client.post("/auth/logout");
}

export function pushSaved(saved) {
  return client.put("/me/saved", { saved });
}

export function pushReadings(readings) {
  return client.put("/me/readings", { readings });
}
