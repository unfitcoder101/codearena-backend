const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username max 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,    // always store as lowercase
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // ── Stats (updated as user solves problems) ──
    solvedCount: {
      type: Number,
      default: 0,
    },
    attemptCount: {
      type: Number,
      default: 0,      // total submissions made
    },
    averageQualityScore: {
      type: Number,
      default: null,   // average AI score across all submissions
    },

    // ── Weak topics (updated by AI pattern detection) ──
    // e.g. ["off-by-one errors", "misses empty input"]
    weakPatterns: {
      type: [String],
      default: [],
    },
    isAdmin: {
  type: Boolean,
  default: false,
},
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
);

// Index email for fast login lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model("User", userSchema);