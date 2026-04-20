const Problem = require("../models/Problem");

// ─────────────────────────────────────────────
// GET /api/problems
// ─────────────────────────────────────────────
exports.getAllProblems = async (req, res) => {
  try {
    // Support filtering by difficulty and tag
    const filter = {};
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.tag) filter.tags = req.query.tag;

    const problems = await Problem.find(filter)
      .select("-hiddenTestCases")   // NEVER send hidden test cases to frontend
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems,
    });

  } catch (err) {
    console.error("[Problem] getAllProblems error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problems",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/problems/:id
// ─────────────────────────────────────────────
exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .select("-hiddenTestCases")   // hidden test cases stay hidden
      .lean();

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    return res.status(200).json({
      success: true,
      problem,
    });

  } catch (err) {
    console.error("[Problem] getProblemById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problem",
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/problems
// Protected — only logged-in users can create problems
// ─────────────────────────────────────────────
exports.createProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      tags,
      inputFormat,
      outputFormat,
      constraints,
      sampleInput,
      sampleOutput,
      hiddenTestCases,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const problem = await Problem.create({
      title,
      description,
      difficulty: difficulty || "Easy",
      tags: tags || [],
      inputFormat,
      outputFormat,
      constraints,
      sampleInput,
      sampleOutput,
      hiddenTestCases: hiddenTestCases || [],
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Problem created successfully",
      problem,
    });

  } catch (err) {
    console.error("[Problem] createProblem error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create problem",
    });
  }
};