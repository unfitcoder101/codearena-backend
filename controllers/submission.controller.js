const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const Analysis = require("../models/Analysis");
const User = require("../models/User");
const { runCode } = require("../utils/runCode");
const { runAnalyzer } = require("../services/ai/analyzer.runner");
const { createSubmission, getMySubmissions, 
        getSubmissionById, getSubmissionsByProblem,
        runCode_ } = require("../controllers/submission.controller");
// POST /api/submissions/run
// Runs code against SAMPLE input only — no verdict saved
// Like LeetCode's "Run" button
exports.runCode_ = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "problemId, language, and code are required",
      });
    }

    const problem = await Problem.findById(problemId).lean();
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    // Only run against sample input — not hidden test cases
    const input = problem.sampleInput || "";
    const expected = String(problem.sampleOutput || "").trim();

    let output;
    try {
      output = await runCode(language, code, input);
    } catch (err) {
      return res.status(200).json({
        success: true,
        verdict: "CE",
        error: err.message.slice(0, 500),
        output: null,
        expected,
      });
    }

    const actual = String(output ?? "").trim();
    const passed = actual === expected;

    return res.status(200).json({
      success: true,
      verdict: passed ? "PASS" : "FAIL",
      output: actual,
      expected,
      passed,
    });

  } catch (err) {
    console.error("[Run] error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to run code",
    });
  }
};

exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "problemId, language, and code are all required",
      });
    }

    const SUPPORTED_LANGUAGES = ["cpp", "js", "java"];
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' not supported. Use: ${SUPPORTED_LANGUAGES.join(", ")}`,
      });
    }

    const problem = await Problem.findById(problemId).lean();
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    // Save submission immediately as PENDING
    const submission = await Submission.create({
      user: req.user.id,
      problem: problemId,
      language,
      code,
      status: "PENDING",
    });

    // Create analysis placeholder
    await Analysis.create({
      userId: req.user.id,
      submissionId: submission._id,
      problemId: submission.problem,
      status: "pending",
    });

    // ── Build test cases ──
    // Use hidden test cases if they exist, otherwise fall back to sample
    const testCases = problem.hiddenTestCases && problem.hiddenTestCases.length > 0
      ? problem.hiddenTestCases
      : [{ input: problem.sampleInput || "", expectedOutput: problem.sampleOutput || problem.expectedOutput || "" }];

    // ── Run code against ALL test cases ──
    let verdict = "AC";
    let failedOutput = null;
    let failedExpected = null;
    let failedTestCase = null;
    let errorMessage = null;
    const startTime = Date.now();

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];

        let output;
        try {
          output = await runCode(language, code, tc.input || "");
        } catch (err) {
          // CE or TLE
          const errMsg = err.message || "";
          if (errMsg.includes("Time Limit")) {
            verdict = "TLE";
          } else {
            verdict = "CE";
          }
          errorMessage = errMsg.slice(0, 1000);
          break;
        }

        const actual = String(output ?? "").trim();
        const expected = String(tc.expectedOutput ?? "").trim();

        if (actual !== expected) {
          verdict = "WA";
          failedOutput = actual;
          failedExpected = expected;
          failedTestCase = i + 1;
          break;
          // Fail fast — stop on first wrong test case
        }
      }
    } catch (err) {
      verdict = "CE";
      errorMessage = err.message.slice(0, 1000);
    }

    const executionTime = Date.now() - startTime;

    // Save final verdict
    submission.status = verdict;
    submission.errorMessage = errorMessage;
    submission.executionTime = executionTime;
    await submission.save();

    // ── Update user stats ──
    // Increment attempt count always
    // Increment solved count only on first AC for this problem
    const updateData = { $inc: { attemptCount: 1 } };

    if (verdict === "AC") {
      // Check if user already solved this problem before
      const alreadySolved = await Submission.findOne({
        user: req.user.id,
        problem: problemId,
        status: "AC",
        _id: { $ne: submission._id }, // exclude current submission
      }).lean();

      if (!alreadySolved) {
        updateData.$inc.solvedCount = 1;
      }
    }

    await User.findByIdAndUpdate(req.user.id, updateData);

    // ── Fire AI analyzer in background ──
    runAnalyzer(submission._id).catch((err) => {
      console.error(`[Analyzer] Failed for ${submission._id}:`, err.message);
    });

    return res.status(201).json({
      success: true,
      verdict,
      executionTime,
      totalTestCases: testCases.length,
      // Only show which test case failed, not the actual test case content
      failedOnTestCase: failedTestCase,
      output: failedOutput,
      expected: failedExpected,
      error: errorMessage,
      submission,
    });

  } catch (err) {
    console.error("[Submission] createSubmission error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing your submission",
    });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user.id })
      .populate("problem", "title difficulty tags")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error("[Submission] getMySubmissions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
    });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("problem", "title difficulty")
      .lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    if (submission.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this submission",
      });
    }

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (err) {
    console.error("[Submission] getSubmissionById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission",
    });
  }
};

// GET /api/submissions/problem/:problemId
// All my submissions for one specific problem
exports.getSubmissionsByProblem = async (req, res) => {
  try {
    const submissions = await Submission.find({
      user: req.user.id,
      problem: req.params.problemId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error("[Submission] getSubmissionsByProblem error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
    });
  }
};
// PATCH /api/submissions/:id/notes
// User adds personal notes to their submission
exports.updateSubmissionNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({
        success: false,
        message: "Notes field is required",
      });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    if (submission.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your submission",
      });
    }

    submission.notes = notes;
    await submission.save();

    return res.status(200).json({
      success: true,
      message: "Notes saved",
      notes: submission.notes,
    });

  } catch (err) {
    console.error("[Submission] updateNotes error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save notes",
    });
  }
};