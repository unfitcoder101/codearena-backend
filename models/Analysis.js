const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      unique: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    feedback: {
      summary: String,
      timeComplexity: String,
      spaceComplexity: String,
      improvements: [String],
      edgeCases: [String],
      hints: [String],
      codeQualityScore: Number,
    },
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);