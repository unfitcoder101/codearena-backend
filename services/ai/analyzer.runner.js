const Submission = require("../../models/Submission");
const Problem = require("../../models/Problem");
const Analysis = require("../../models/Analysis");

async function runAnalyzer(submissionId) {
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) return;

    const problem = await Problem.findById(submission.problem);
    if (!problem) return;

    // simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const feedback = {
      summary: "Your solution works but can be optimized.",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      improvements: ["Consider edge cases like empty input"],
      edgeCases: ["Empty array", "Single element"],
      hints: ["Think about boundary conditions"],
      codeQualityScore: 7,
    };

    await Analysis.findOneAndUpdate(
      { submissionId },
      {
        status: "completed",
        feedback,
      }
    );

  } catch (error) {
    await Analysis.findOneAndUpdate(
      { submissionId },
      {
        status: "failed",
        error: error.message,
      }
    );
  }
}

module.exports = { runAnalyzer };