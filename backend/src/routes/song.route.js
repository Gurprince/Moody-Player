// src/routes/song.route.js
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const songModel = require("../models/songs.model");
const uploadFile = require("../service/storage.service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MOODS = ["happy", "sad", "angry", "neutral"];

/* Rows without an audio URL are dead weight from earlier imports; the
   library never counts or serves them. */
const PLAYABLE = { audio: { $nin: [null, ""] } };

const ESCAPE_ME = "^$.*+?()[]{}|" + String.fromCharCode(92);
function escapeRegex(value) {
  return value
    .split("")
    .map((c) => (ESCAPE_ME.includes(c) ? String.fromCharCode(92) + c : c))
    .join("");
}

// Mood → JioSaavn query keywords
const moodMappings = {
  neutral: "punjabi mix",
  angry: "punjabi rap",
  sad: "sad punjabi",
  happy: "punjabi party",
};

function mapJioSaavnTrack(track, mood) {
  return {
    title: track.name || "Unknown",
    artist: track.primaryArtists || "Unknown",
    audio: track.downloadUrl?.[track.downloadUrl.length - 1]?.link || "",
    songCover: track.image?.[track.image.length - 1]?.link || "",
    mood,
  };
}

/* ------------------------------------------------------------------
   GET /songs?mood=happy — tracks for a mood, fresh from JioSaavn when
   it answers, from the cached library when it doesn't.
   ------------------------------------------------------------------ */
router.get("/songs", async (req, res) => {
  try {
    const { mood } = req.query;

    if (!mood || !moodMappings[mood]) {
      return res.status(400).json({
        message: "Pick one of: happy, sad, angry, neutral.",
      });
    }

    const query = moodMappings[mood];
    const saavnUrl = `https://jiosaavn-api.vercel.app/search/songs?query=${encodeURIComponent(
      query
    )}`;

    let freshSongs = [];
    try {
      const response = await axios.get(saavnUrl, { timeout: 8000 });
      const tracks = response.data?.data?.results || [];

      for (const track of tracks) {
        if (!track.downloadUrl || track.downloadUrl.length === 0) continue;

        const songData = mapJioSaavnTrack(track, mood);
        if (!songData.audio) continue;

        freshSongs.push(songData);

        await songModel.findOneAndUpdate(
          { title: songData.title, artist: songData.artist },
          songData,
          { upsert: true }
        );
      }
    } catch (apiErr) {
      console.warn("JioSaavn unavailable, serving the library:", apiErr.message);
    }

    if (freshSongs.length === 0) {
      freshSongs = await songModel.find({ mood, ...PLAYABLE }).limit(20).lean();
    }

    res.status(200).json({
      message: "Songs fetched successfully",
      songs: freshSongs.filter((s) => s.audio),
    });
  } catch (err) {
    console.error("Error fetching songs:", err.message);
    res.status(500).json({ message: "Couldn't reach the song library." });
  }
});

/* ------------------------------------------------------------------
   GET /library?q=&mood=&page=&limit= — the saved library, searchable.
   ------------------------------------------------------------------ */
router.get("/library", async (req, res) => {
  try {
    const { q = "", mood = "" } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);

    const filter = { ...PLAYABLE };
    if (mood && MOODS.includes(mood)) filter.mood = mood;
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
    console.error("Error reading library:", err.message);
    res.status(500).json({ message: "Couldn't read the library." });
  }
});

/* ------------------------------------------------------------------
   GET /moods — how many tracks sit under each mood.
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
    console.error("Error counting moods:", err.message);
    res.status(500).json({ message: "Couldn't count the library." });
  }
});

/* ------------------------------------------------------------------
   POST /songs — add a track to the library.
   ------------------------------------------------------------------ */
router.post(
  "/songs",
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
          message: "Title, artist and one of happy/sad/angry/neutral are required.",
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
      });

      res.status(201).json({ message: "Track added", song });
    } catch (err) {
      console.error("Upload failed:", err.message);
      res.status(500).json({ message: "The upload didn't finish. Try again." });
    }
  }
);

module.exports = router;
