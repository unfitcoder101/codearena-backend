const Problem = require("../models/Problem");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/problems/:id/hint
// Returns one hint without spoiling the solution
exports.getHint = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .select("-hiddenTestCases")
      .lean();

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    const { level = 1 } = req.body;
    // level 1 = gentle, level 2 = directional, level 3 = strong

    const hintPrompts = {
      1: "Give a very gentle hint — just point toward the right category of algorithm. Don't mention specific data structures.",
      2: "Give a directional hint — mention the type of data structure or technique that would help, but don't give the approach.",
      3: "Give a strong hint — describe the approach at a high level without writing any code.",
    };

    const prompt = `
Problem: ${problem.title}
Description: ${problem.description}
Constraints: ${problem.constraints || "None"}

${hintPrompts[level] || hintPrompts[1]}

Respond in 1-2 sentences maximum. Be concise.
    `.trim();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: "You are a coding mentor giving hints. Never give away the full solution. Be brief.",
        },
        { role: "user", content: prompt },
      ],
    });

    const hint = response.choices[0]?.message?.content;

    return res.status(200).json({
      success: true,
      hint,
      level,
    });

  } catch (err) {
    console.error("[Problem] getHint error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate hint",
    });
  }
};
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

exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    await Problem.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Problem deleted",
    });

  } catch (err) {
    console.error("[Problem] deleteProblem error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete problem",
    });
  }
};