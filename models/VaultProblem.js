const mongoose = require("mongoose");

const vaultProblemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,        // fast lookup: "all vault problems for this user"
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
    },
    platform: {
      type: String,
      required: [true, "Platform is required"],
      trim: true,
      // e.g. "LeetCode", "Codeforces", "GeeksForGeeks"
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Unknown"],
      default: "Unknown",
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: "",
      maxlength: [2000, "Notes max 2000 characters"],
    },
    solved: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ── Progress tracking ──
    // How many times has the user attempted this problem
    attemptCount: {
      type: Number,
      default: 0,
    },
    // When they last attempted it
    lastAttemptedAt: {
      type: Date,
      default: null,
    },

    // ── AI generated fields ──
    // Stored so we don't call Gemini every time they open the problem
    aiHints: {
      type: [String],
      default: [],
    },
    aiSummary: {
      type: String,
      default: null,
    },
    // null = never requested, "pending" = generating, "completed" = ready
    aiStatus: {
      type: String,
      enum: ["pending", "completed", null],
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: fast lookup for "all vault problems for user, newest first"
vaultProblemSchema.index({ user: 1, createdAt: -1 });
vaultProblemSchema.index({ user: 1, solved: 1 });

module.exports = mongoose.model("VaultProblem", vaultProblemSchema);