const mongoose = require("mongoose");

/** A track someone bookmarked, once per user per track. */
const savedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    trackKey: { type: String, required: true },
    title: String,
    artist: String,
    mood: String,
    audio: String,
    songCover: String,
    savedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

savedSchema.index({ user: 1, trackKey: 1 }, { unique: true });
savedSchema.index({ user: 1, savedAt: -1 });

module.exports = mongoose.model("saved", savedSchema);
