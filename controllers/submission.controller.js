const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const { runCppCode } = require("../utils/runCode");

exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const submission = await Submission.create({
      user: req.user.id,
      problem: problemId,
      language,
      code,
      status: "PENDING",
    });

    let output;

    try {
      if (language === "cpp") {
        // 🔥 PASS SAMPLE INPUT
        output = await runCppCode(code, problem.sampleInput || "");
      }
    } catch (err) {
      submission.status = "CE";
      await submission.save();

      return res.status(201).json({
        message: "Compilation / Runtime Error",
        error: err.toString(),
        submission,
      });
    }

    output = String(output).trim();
    const expected = String(problem.expectedOutput).trim();

    const verdict = output === expected ? "AC" : "WA";

    submission.status = verdict;
    await submission.save();

    res.status(201).json({
      message: "Judged successfully",
      output,
      verdict,
      submission,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
