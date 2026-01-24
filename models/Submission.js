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
      enum: ["cpp", "js", "python"], // allowed languages
    },
    code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "AC", "WA", "TLE", "CE"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
