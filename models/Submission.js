const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["cpp", "js", "java"],   // matches your 3 runners exactly
    },
    code: {
      type: String,
      required: true,
      maxlength: [50000, "Code too long (max 50,000 characters)"],
    },
    status: {
      type: String,
      enum: ["PENDING", "AC", "WA", "TLE", "CE"],
      default: "PENDING",
    },
    // Error message for CE/TLE — shown to user
    errorMessage: {
      type: String,
      default: null,
    },
    // Personal notes added by user after seeing AI feedback
    notes: {
      type: String,
      default: null,
      maxlength: [2000, "Notes max 2000 characters"],
    },
    // Execution time in ms (set by runner later)
    executionTime: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup: "all submissions by this user, newest first"
submissionSchema.index({ user: 1, createdAt: -1 });
// Fast lookup: "all submissions for this problem"
submissionSchema.index({ problem: 1, status: 1 });

module.exports = mongoose.model("Submission", submissionSchema);