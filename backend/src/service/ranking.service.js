const feedbackModel = require("../models/feedback.model");

/** Stable id for a track across providers. */
const trackKey = (track) =>
  `${(track.title || "").trim()}::${(track.artist || "").trim()}`.toLowerCase();

/* What each signal is worth. Your own history counts for much more than
   the crowd's, and a thumbs-down removes the track from that mood outright. */
const MINE = { save: 4, play: 1, skip: -2.5, unsave: -1, down: -100 };
const CROWD = { save: 0.6, play: 0.08, skip: -0.35, unsave: -0.2, down: -1.2 };
const CROWD_CAP = 3;

/**
 * Reorders a mood's tracks using what this listener — and everyone else —
 * did with them last time the same mood came up.
 */
async function rank(tracks, { client, mood }) {
  if (!tracks.length) return { tracks, personalised: false };

  const keys = tracks.map(trackKey);

  const [mine, crowd] = await Promise.all([
    client
      ? feedbackModel
          .find({ client, mood, trackKey: { $in: keys } })
          .select("trackKey signal")
          .lean()
      : [],
    feedbackModel.aggregate([
      { $match: { mood, trackKey: { $in: keys } } },
      { $group: { _id: { key: "$trackKey", signal: "$signal" }, n: { $sum: 1 } } },
    ]),
  ]);

  const mineScore = new Map();
  const banned = new Set();
  for (const row of mine) {
    if (row.signal === "down") banned.add(row.trackKey);
    mineScore.set(
      row.trackKey,
      (mineScore.get(row.trackKey) || 0) + (MINE[row.signal] || 0)
    );
  }

  const crowdScore = new Map();
  for (const row of crowd) {
    const { key, signal } = row._id;
    const value = (CROWD[signal] || 0) * row.n;
    crowdScore.set(key, (crowdScore.get(key) || 0) + value);
  }

  const scored = tracks
    .map((track, index) => {
      const key = keys[index];
      const crowdPart = Math.max(
        -CROWD_CAP,
        Math.min(CROWD_CAP, crowdScore.get(key) || 0)
      );
      return {
        track,
        key,
        // the provider's own order is the tie-breaker, lightly weighted
        score: (mineScore.get(key) || 0) + crowdPart - index * 0.01,
      };
    })
    .filter((row) => !banned.has(row.key))
    .sort((a, b) => b.score - a.score);

  return {
    tracks: scored.map((row) => row.track),
    personalised: mineScore.size > 0 || crowdScore.size > 0,
    removed: banned.size,
  };
}

module.exports = { rank, trackKey };
