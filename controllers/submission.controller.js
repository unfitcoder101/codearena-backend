const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const { runCppCode } = require("../utils/runCode");

/*
  CREATE SUBMISSION + JUDGE
*/
exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    // 1️⃣ Create submission as PENDING
    const submission = await Submission.create({
      user: req.user.id,
      problem: problemId,
      language,
      code,
      status: "PENDING",
    });

    // 2️⃣ Fetch problem (for input & expected output)
    const problem = await Problem.findById(problemId);
    if (!problem) {
      submission.status = "ERR";
      await submission.save();
      return res.status(404).json({ message: "Problem not found" });
    }

    let output = "";

    // 3️⃣ Execute code WITH INPUT
    try {
      if (language === "cpp") {
        output = await runCppCode(
          code,
          problem.sampleInput || ""
        );
      } else {
        submission.status = "ERR";
        await submission.save();
        return res.status(400).json({ message: "Unsupported language" });
      }
    } catch (err) {
      console.error("Runner error:", err);

      submission.status = "CE";
      await submission.save();

      return res.status(201).json({
        message: "Compilation / Runtime Error",
        error: err.toString(),
        submission,
      });
    }

    // 4️⃣ Normalize output
    const actualOutput = String(output).trim();
    const expectedOutput = String(problem.expectedOutput || "").trim();

    // 5️⃣ Judge
    const verdict = actualOutput === expectedOutput ? "AC" : "WA";

    submission.status = verdict;
    await submission.save();

    // 6️⃣ Respond
    return res.status(201).json({
      message: "Judged successfully",
      output: actualOutput,
      verdict,
      submission,
    });

  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ error: error.message });
  }
};
