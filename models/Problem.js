const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },

    // OPTIONAL (can add later)
    inputFormat: {
      type: String,
      default: "",
    },
    outputFormat: {
      type: String,
      default: "",
    },
    constraints: {
      type: String,
      default: "",
    },
    sampleInput: {
      type: String,
      default: "",
    },
    sampleOutput: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);
