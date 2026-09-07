const mongoose = require("mongoose");

/**
 * One row per signal a listener gives a track while in a mood. `client` is an
 * anonymous id the browser generates, so this works without accounts.
 * Signals: save / unsave / play / skip / down.
 */
const feedbackSchema = new mongoose.Schema(
  {
    client: { type: String, required: true, index: true },
    // set once the signals belong to an account rather than a browser
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", index: true },
    trackKey: { type: String, required: true, index: true },
    title: String,
    artist: String,
    mood: { type: String, index: true },
    signal: {
      type: String,
      enum: ["save", "unsave", "play", "skip", "down"],
      required: true,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ client: 1, mood: 1, trackKey: 1 });
feedbackSchema.index({ mood: 1, trackKey: 1, signal: 1 });

module.exports = mongoose.model("feedback", feedbackSchema);
