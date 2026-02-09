const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    highestUnlockedLevel: { type: Number, default: 1, min: 1, max: 5 },
    bestScore: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Ensure index for leaderboard queries
userSchema.index({ bestScore: -1 });

module.exports = mongoose.model("User", userSchema);
