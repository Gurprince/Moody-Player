const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    title: String,
    artist: String,
    audio: String,
    mood: String,
    songCover: String,

    // where the row came from, so a provider can be re-crawled or retired
    source: { type: String, default: "upload" },
    sourceId: String,
    durationMs: Number,
    genre: String,

    // true when `audio` is a short preview rather than the whole track
    preview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

songSchema.index({ mood: 1, audio: 1 });
songSchema.index({ title: "text", artist: "text" });
songSchema.index({ source: 1, sourceId: 1 });

module.exports = mongoose.model("song", songSchema);
