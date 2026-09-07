const express = require("express");
const multer = require("multer");
const songModel = require("../models/songs.model");
const feedbackModel = require("../models/feedback.model");
const uploadFile = require("../service/storage.service");
const {
  MOODS,
  PLAYABLE,
  tracksForMood,
  tracksForBlend,
} = require("../service/catalog.service");
const {
  LANGUAGES,
  GENRES,
  FEELING_HINTS,
  readFeeling,
  languageList,
  genreList,
} = require("../service/taste");
const { rank, trackKey } = require("../service/ranking.service");
const { sourceHealth } = require("../service/sources");
const rateLimit = require("../middleware/rateLimit");
const { ownerOf } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);

/** Signed in, taste belongs to the account; signed out, to the browser id. */
const clientOf = ownerOf;

/** "happy:0.6,neutral:0.4" → { happy: 0.6, neutral: 0.4 } */
function parseBlend(raw) {
  if (!raw) return null;
  const weights = {};
  for (const part of String(raw).split(",")) {
    const [mood, value] = part.split(":");
    const key = (mood || "").trim();
    const num = Number(value);
    if (MOODS.includes(key) && Number.isFinite(num) && num > 0) {
      weights[key] = num;
    }
  }
  return Object.keys(weights).length ? weights : null;
}

/* ------------------------------------------------------------------
   GET /songs?mood=happy
   GET /songs?blend=neutral:0.7,happy:0.2
   ------------------------------------------------------------------ */
router.get(
  "/songs",
  rateLimit({ windowMs: 60_000, max: 40, name: "search" }),
  async (req, res) => {
    try {
      const feeling = readFeeling(req.query.feeling);
      /* A typed feeling that maps onto known words becomes the blend; one
         that doesn't still shapes the search, it just can't claim a mood. */
      const blend = parseBlend(req.query.blend) || feeling?.weights || null;
      const { mood } = req.query;

      if (!blend && !MOODS.includes(mood)) {
        return res.status(400).json({
          message:
            "Pass mood=happy|sad|angry|neutral, blend=mood:weight,… or feeling=…",
        });
      }

      const options = {
        limit: Math.min(Number(req.query.limit) || 24, 40),
        language: LANGUAGES[req.query.lang] ? req.query.lang : "punjabi",
        genre: GENRES[req.query.genre] ? req.query.genre : "any",
        feeling,
      };

      const result = blend
        ? await tracksForBlend(blend, options)
        : await tracksForMood(mood, options);

      const topMood = blend
        ? Object.entries(blend).sort((a, b) => b[1] - a[1])[0][0]
        : mood;

      const ranked = await rank(result.tracks, {
        client: clientOf(req),
        mood: topMood,
      });

      res.status(200).json({
        songs: ranked.tracks,
        mood: topMood,
        blend: result.blend || null,
        language: result.language,
        genre: result.genre,
        feeling: feeling
          ? { text: feeling.text, matched: feeling.matched, understood: Boolean(feeling.weights) }
          : null,
        source: result.source,
        cached: Boolean(result.cached),
        personalised: ranked.personalised,
      });
    } catch (err) {
      console.error("[/songs]", err.message);
      res.status(500).json({ message: "Couldn't reach the song library." });
    }
  }
);

/* ------------------------------------------------------------------
   GET /library?q=&mood=&page=&limit=
   ------------------------------------------------------------------ */
router.get("/library", async (req, res) => {
  try {
    const { q = "", mood = "", lang = "" } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);

    const filter = { ...PLAYABLE };
    if (MOODS.includes(mood)) filter.mood = mood;
    if (LANGUAGES[lang]) filter.language = lang;
    if (q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [{ title: rx }, { artist: rx }];
    }

    const [songs, total] = await Promise.all([
      songModel
        .find(filter)
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      songModel.countDocuments(filter),
    ]);

    res.status(200).json({
      songs,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("[/library]", err.message);
    res.status(500).json({ message: "Couldn't read the library." });
  }
});

/* ------------------------------------------------------------------
   GET /moods — how many tracks sit under each mood
   ------------------------------------------------------------------ */
router.get("/moods", async (req, res) => {
  try {
    const rows = await songModel.aggregate([
      { $match: PLAYABLE },
      { $group: { _id: "$mood", count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(MOODS.map((m) => [m, 0]));
    rows.forEach((row) => {
      if (row._id in counts) counts[row._id] = row.count;
    });
    res.status(200).json({ moods: counts });
  } catch (err) {
    console.error("[/moods]", err.message);
    res.status(500).json({ message: "Couldn't count the library." });
  }
});

/* ------------------------------------------------------------------
   GET /options — the languages, genres and feeling words on offer
   ------------------------------------------------------------------ */
router.get("/options", (req, res) => {
  res.status(200).json({
    languages: languageList(),
    genres: genreList(),
    feelings: FEELING_HINTS,
  });
});

/* ------------------------------------------------------------------
   POST /feedback — one signal about one track in one mood
   ------------------------------------------------------------------ */
router.post(
  "/feedback",
  rateLimit({ windowMs: 60_000, max: 240, name: "signal" }),
  async (req, res) => {
    try {
      const client = clientOf(req) || req.body.client;
      const { title, artist, mood, signal } = req.body;

      if (!client) return res.status(400).json({ message: "Missing client id." });
      if (!["save", "unsave", "play", "skip", "down"].includes(signal)) {
        return res.status(400).json({ message: "Unknown signal." });
      }
      if (!title) return res.status(400).json({ message: "Missing track." });

      await feedbackModel.create({
        client,
        user: req.user?._id,
        trackKey: trackKey({ title, artist }),
        title,
        artist,
        mood: MOODS.includes(mood) ? mood : "neutral",
        signal,
      });

      res.status(201).json({ ok: true });
    } catch (err) {
      console.error("[/feedback]", err.message);
      res.status(500).json({ message: "Couldn't record that." });
    }
  }
);

/* ------------------------------------------------------------------
   GET /taste — what this browser's signals add up to
   ------------------------------------------------------------------ */
router.get("/taste", async (req, res) => {
  try {
    const client = clientOf(req);
    if (!client) return res.status(200).json({ moods: {}, total: 0 });

    const rows = await feedbackModel.aggregate([
      { $match: { client } },
      { $group: { _id: { mood: "$mood", signal: "$signal" }, n: { $sum: 1 } } },
    ]);

    const moods = {};
    let total = 0;
    for (const row of rows) {
      const { mood, signal } = row._id;
      moods[mood] = moods[mood] || { save: 0, play: 0, skip: 0, down: 0, unsave: 0 };
      moods[mood][signal] = row.n;
      total += row.n;
    }
    res.status(200).json({ moods, total });
  } catch (err) {
    console.error("[/taste]", err.message);
    res.status(500).json({ message: "Couldn't read your signals." });
  }
});

/* ------------------------------------------------------------------
   POST /songs — add a track to the library
   ------------------------------------------------------------------ */
router.post(
  "/songs",
  rateLimit({ windowMs: 60_000, max: 10, name: "upload" }),
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, artist, mood } = req.body;
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];

      if (!title || !artist || !MOODS.includes(mood)) {
        return res.status(400).json({
          message:
            "Title, artist and one of happy/sad/angry/neutral are required.",
        });
      }
      if (!audioFile) {
        return res.status(400).json({ message: "Attach an audio file." });
      }

      const [audioUpload, coverUpload] = await Promise.all([
        uploadFile(audioFile),
        coverFile ? uploadFile(coverFile) : Promise.resolve(null),
      ]);

      const song = await songModel.create({
        title,
        artist,
        mood,
        audio: audioUpload.url,
        songCover: coverUpload?.url || "",
        source: "upload",
        preview: false,
      });

      res.status(201).json({ message: "Track added", song });
    } catch (err) {
      console.error("[POST /songs]", err.message);
      res.status(500).json({ message: "The upload didn't finish. Try again." });
    }
  }
);

/* ------------------------------------------------------------------
   GET /health — which providers are answering
   ------------------------------------------------------------------ */
router.get("/health", async (req, res) => {
  let library = null;
  try {
    library = await songModel.countDocuments(PLAYABLE);
  } catch {
    library = null;
  }
  res.status(200).json({
    ok: true,
    library,
    sources: sourceHealth(),
  });
});

module.exports = router;
