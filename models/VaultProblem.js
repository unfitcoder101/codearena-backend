const mongoose = require("mongoose");

const vaultProblemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    link: {
      type: String,
      required: true,
    },

    platform: {
      type: String,
      required: true, // Codeforces / LeetCode / etc
    },

    difficulty: {
      type: String,
      default: "Unknown",
    },

    tags: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      default: "",
    },

    solved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VaultProblem", vaultProblemSchema);
