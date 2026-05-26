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
    const filter = {};
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.tag) filter.tags = req.query.tag;

    // Get token if exists — to show personal problems
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          authHeader.split(" ")[1],
          process.env.JWT_SECRET
        );
        userId = decoded.id;
      } catch (_) {}
    }

    // Show public problems + user's own private problems
    const query = userId
  ? { ...filter, $or: [{ isPublic: true }, { isPublic: { $exists: false } }, { createdBy: userId }] }
  : { ...filter, $or: [{ isPublic: true }, { isPublic: { $exists: false } }] };
    const problems = await Problem.find(query)
      .select("-hiddenTestCases")
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
      title, description, difficulty, tags,
      inputFormat, outputFormat, constraints,
      sampleInput, sampleOutput, hiddenTestCases,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    // Admins create public problems visible to everyone
    // Regular users create private problems visible only to them
    const isPublic = req.user.isAdmin ? true : false;

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
      isPublic,
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

    // Only creator or admin can delete
    if (
      problem.createdBy.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own problems",
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