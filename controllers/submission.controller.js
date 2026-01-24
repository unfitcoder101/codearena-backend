const Submission = require("../models/Submission");
const { runCppCode } = require("../utils/runCode");
const Problem = require("../models/Problem"); // MUST be here (top level)

exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    // 1) First store the submission as PENDING
    const submission = await Submission.create({
      user: req.user.id,
      problem: problemId,
      language,
      code,
      status: "PENDING",
    });

    // 2) Run the code
    let output = "";

try {
  if (language === "cpp") {
    output = await runCppCode(code);
  }
} catch (err) {
  console.error("Runner error:", err);

  submission.status = "CE";
  await submission.save();

  return res.status(201).json({
    message: "Compilation Error",
    error: err.toString(),
    submission,
  });
}

// ---- REAL JUDGING STARTS HERE ----

// Make sure output is always a string
output = String(output || "").trim();

// Fetch problem
const problem = await Problem.findById(problemId);

if (!problem) {
  return res.status(404).json({ message: "Problem not found" });
}

// Make sure expectedOutput exists and is a string
const expected = String(problem.expectedOutput || "").trim();

let verdict = "AC";
if (output !== expected) {
  verdict = "WA";
}

// Save verdict
submission.status = verdict;
await submission.save();

return res.status(201).json({
  message: "Judged successfully",
  output,
  verdict,
  submission,
});

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
