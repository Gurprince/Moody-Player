const express = require("express");
const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const savedModel = require("../models/saved.model");
const readingModel = require("../models/reading.model");
const feedbackModel = require("../models/feedback.model");
const { issue, clear, requireUser } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/* Sign-in is the one place worth guarding hard. */
const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 20, name: "attempt" });

function checkCredentials(email, password) {
  if (!email || !EMAIL.test(email)) return "Enter a valid email address.";
  if (!password || password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters for the password.`;
  }
  return null;
}

/**
 * Adopts whatever this browser did before signing in: bookmarks, readings and
 * the taste signals filed under its anonymous id.
 */
async function adopt(user, { saved = [], readings = [], client }) {
  const userId = user._id;
  let tracks = 0;
  let entries = 0;

  if (Array.isArray(saved) && saved.length) {
    const rows = saved
      .filter((s) => s && s.title)
      .slice(0, 500)
      .map((s) => ({
        updateOne: {
          filter: {
            user: userId,
            trackKey: `${s.title}::${s.artist || ""}`.toLowerCase(),
          },
          update: {
            $setOnInsert: {
              user: userId,
              trackKey: `${s.title}::${s.artist || ""}`.toLowerCase(),
              title: s.title,
              artist: s.artist,
              mood: s.mood,
              audio: s.audio,
              songCover: s.songCover,
              savedAt: s.savedAt || Date.now(),
            },
          },
          upsert: true,
        },
      }));
    if (rows.length) {
      const out = await savedModel.bulkWrite(rows, { ordered: false });
      tracks = out.upsertedCount || 0;
    }
  }

  if (Array.isArray(readings) && readings.length) {
    const rows = readings
      .filter((r) => r && r.at)
      .slice(0, 500)
      .map((r) => ({
        updateOne: {
          filter: { user: userId, at: r.at },
          update: {
            $setOnInsert: {
              user: userId,
              at: r.at,
              mood: r.mood,
              how: r.how,
              scores: r.scores || undefined,
              found: r.found,
              faces: r.faces,
            },
          },
          upsert: true,
        },
      }));
    if (rows.length) {
      const out = await readingModel.bulkWrite(rows, { ordered: false });
      entries = out.upsertedCount || 0;
    }
  }

  // Taste signals move from the browser id onto the account.
  let signals = 0;
  if (client && client !== userId.toString()) {
    const out = await feedbackModel.updateMany(
      { client },
      { $set: { client: userId.toString(), user: userId } }
    );
    signals = out.modifiedCount || 0;
  }

  return { tracks, entries, signals };
}

async function stateFor(user) {
  const [saved, readings] = await Promise.all([
    savedModel.find({ user: user._id }).sort({ savedAt: -1 }).limit(500).lean(),
    readingModel.find({ user: user._id }).sort({ at: -1 }).limit(200).lean(),
  ]);
  return {
    saved: saved.map((s) => ({
      title: s.title,
      artist: s.artist,
      mood: s.mood,
      audio: s.audio,
      songCover: s.songCover,
      savedAt: s.savedAt,
    })),
    readings: readings.map((r) => ({
      mood: r.mood,
      how: r.how,
      scores: r.scores,
      found: r.found,
      faces: r.faces,
      at: r.at,
    })),
  };
}

/* ------------------------------------------------------------------ */

router.post("/auth/register", authLimit, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    const problem = checkCredentials(email, password);
    if (problem) return res.status(400).json({ message: problem });

    if (await userModel.findOne({ email })) {
      return res
        .status(409)
        .json({ message: "That email already has an account. Sign in instead." });
    }

    const user = await userModel.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });

    const migrated = await adopt(user, {
      saved: req.body.saved,
      readings: req.body.readings,
      client: req.get("X-Client-Id"),
    });

    issue(res, user);
    res.status(201).json({
      user: user.toPublic(),
      migrated,
      ...(await stateFor(user)),
    });
  } catch (err) {
    console.error("[/auth/register]", err.message);
    res.status(500).json({ message: "Couldn't create the account." });
  }
});

router.post("/auth/login", authLimit, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await userModel.findOne({ email });
    // Same message either way, so this can't be used to find out who has an account.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: "Email or password is wrong." });
    }

    const migrated = await adopt(user, {
      saved: req.body.saved,
      readings: req.body.readings,
      client: req.get("X-Client-Id"),
    });

    issue(res, user);
    res.status(200).json({
      user: user.toPublic(),
      migrated,
      ...(await stateFor(user)),
    });
  } catch (err) {
    console.error("[/auth/login]", err.message);
    res.status(500).json({ message: "Couldn't sign you in." });
  }
});

router.post("/auth/logout", (req, res) => {
  clear(res);
  res.status(200).json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  if (!req.user) return res.status(200).json({ user: null });
  res.status(200).json({ user: req.user.toPublic(), ...(await stateFor(req.user)) });
});

/* ------------------------------------------------------------------
   The signed-in copy of what the browser keeps locally.
   ------------------------------------------------------------------ */

router.put("/me/saved", requireUser, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.saved) ? req.body.saved.slice(0, 500) : [];
    const keys = rows
      .filter((s) => s && s.title)
      .map((s) => `${s.title}::${s.artist || ""}`.toLowerCase());

    await savedModel.deleteMany({
      user: req.user._id,
      trackKey: { $nin: keys },
    });

    if (rows.length) {
      await savedModel.bulkWrite(
        rows
          .filter((s) => s && s.title)
          .map((s) => ({
            updateOne: {
              filter: {
                user: req.user._id,
                trackKey: `${s.title}::${s.artist || ""}`.toLowerCase(),
              },
              update: {
                $set: {
                  title: s.title,
                  artist: s.artist,
                  mood: s.mood,
                  audio: s.audio,
                  songCover: s.songCover,
                  savedAt: s.savedAt || Date.now(),
                },
              },
              upsert: true,
            },
          })),
        { ordered: false }
      );
    }
    res.status(200).json({ ok: true, count: rows.length });
  } catch (err) {
    console.error("[PUT /me/saved]", err.message);
    res.status(500).json({ message: "Couldn't save that." });
  }
});

router.put("/me/readings", requireUser, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.readings)
      ? req.body.readings.filter((r) => r && r.at).slice(0, 200)
      : [];

    if (rows.length === 0) {
      await readingModel.deleteMany({ user: req.user._id });
      return res.status(200).json({ ok: true, count: 0 });
    }

    await readingModel.deleteMany({
      user: req.user._id,
      at: { $nin: rows.map((r) => r.at) },
    });

    await readingModel.bulkWrite(
      rows.map((r) => ({
        updateOne: {
          filter: { user: req.user._id, at: r.at },
          update: {
            $set: {
              mood: r.mood,
              how: r.how,
              scores: r.scores || undefined,
              found: r.found,
              faces: r.faces,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    res.status(200).json({ ok: true, count: rows.length });
  } catch (err) {
    console.error("[PUT /me/readings]", err.message);
    res.status(500).json({ message: "Couldn't save your journal." });
  }
});

/** Preferences follow the account so a device change keeps your language. */
router.put("/me/prefs", requireUser, async (req, res) => {
  try {
    const { language, genre } = req.body || {};
    const prefs = { ...(req.user.prefs?.toObject?.() || req.user.prefs || {}) };
    if (typeof language === "string") prefs.language = language;
    if (typeof genre === "string") prefs.genre = genre;

    req.user.prefs = prefs;
    await req.user.save();
    res.status(200).json({ prefs });
  } catch (err) {
    console.error("[PUT /me/prefs]", err.message);
    res.status(500).json({ message: "Couldn't save your preferences." });
  }
});

module.exports = router;
