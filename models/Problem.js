const mongoose = require("mongoose");

// Hidden test case schema
// Each test case has an input and expected output
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, required: true },
  },
  { _id: false }   // no separate _id for each test case
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
      index: true,
    },
    isPublic: {
  type: Boolean,
  default: true,
},

    // ── Tags for weak topic detection ──
    // e.g. ["arrays", "two-pointers", "sorting"]
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // ── Formatting ──
    inputFormat: { type: String, default: "" },
    outputFormat: { type: String, default: "" },
    constraints: { type: String, default: "" },

    // ── Sample (shown to user) ──
    sampleInput: { type: String, default: "" },
    sampleOutput: { type: String, default: "" },

    // ── Judge (hidden from user) ──
    // The real test cases used to evaluate code
    // sampleInput/sampleOutput are just examples shown in UI
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
    },

    // Created by which user (admin/you)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

problemSchema.index({ title: 1 });

module.exports = mongoose.model("Problem", problemSchema);