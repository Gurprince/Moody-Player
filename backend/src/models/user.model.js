const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // bcrypt hash — the plain password never leaves the request handler
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

/** Never let the hash out of the server by accident. */
userSchema.methods.toPublic = function toPublic() {
  return { id: this._id.toString(), email: this.email, since: this.createdAt };
};

module.exports = mongoose.model("user", userSchema);
