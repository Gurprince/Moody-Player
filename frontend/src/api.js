import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const client = axios.create({ baseURL: API_BASE, timeout: 20000 });

export const MOODS = ["happy", "sad", "angry", "neutral"];

export const MOOD_COPY = {
  happy: {
    line: "Bhangra and party sets, for when the volume should go up.",
    verb: "Turn it up",
  },
  sad: {
    line: "Slow Punjabi ballads, for when the room has gone quiet.",
    verb: "Sit with it",
  },
  angry: {
    line: "Punjabi rap with its teeth out.",
    verb: "Let it out",
  },
  neutral: {
    line: "An even mix that doesn't push you either way.",
    verb: "Just play",
  },
};

/** A track's id — library rows have one, JioSaavn results don't. */
export const trackKey = (track) =>
  track?._id || track?.audio || `${track?.title}::${track?.artist}`;

export async function fetchMoodSongs(mood) {
  const { data } = await client.get("/songs", { params: { mood } });
  return Array.isArray(data.songs) ? data.songs : [];
}

export async function fetchLibrary({ q = "", mood = "", page = 1 } = {}) {
  const { data } = await client.get("/library", { params: { q, mood, page } });
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

export function readError(err, fallback) {
  return err?.response?.data?.message || fallback;
}
