const mongoose = require("mongoose");

/** One mood reading, so the journal survives a change of device. */
const readingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    mood: String,
    how: String, // camera | picked | ambient | restored
    scores: {
      happy: Number,
      sad: Number,
      angry: Number,
      neutral: Number,
    },
    found: Number,
    faces: Number,
    at: { type: Number, required: true },
  },
  { timestamps: true }
);

readingSchema.index({ user: 1, at: -1 });
readingSchema.index({ user: 1, at: 1 }, { unique: true });

module.exports = mongoose.model("reading", readingSchema);
