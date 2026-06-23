/**
 * models/Analysis.js
 */

const mongoose = require("mongoose");

const AnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,       // fast lookup by user
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      unique: true,      // one analysis per submission, always
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },

    // ── Status ──
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },

    // ── AI Generated Fields ──
    summary: { type: String, default: null },
    timeComplexity: { type: String, default: null },
    spaceComplexity: { type: String, default: null },
    verdictReasoning: { type: String, default: null },
    improvements: { type: [String], default: [] },
    edgeCases: { type: [String], default: [] },
    hints: { type: [String], default: [] },
    codeQualityScore: { type: Number, min: 1, max: 10, default: null },
    strengthsObserved: { type: [String], default: [] },
    mistakePattern: { type: String, default: null },

    // ── Meta ──
    errorMessage: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,    // adds createdAt + updatedAt automatically
  }
);

module.exports = mongoose.model("Analysis", AnalysisSchema);