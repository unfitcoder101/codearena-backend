const VaultProblem = require("../models/VaultProblem");

// ─────────────────────────────────────────────
// POST /api/vault
// Save a new problem to the vault
// ─────────────────────────────────────────────
exports.createVaultProblem = async (req, res) => {
  try {
    const { title, link, platform, difficulty, tags, notes } = req.body;

    // ── Validate required fields ──
    if (!title || !link || !platform) {
      return res.status(400).json({
        success: false,
        message: "Title, link, and platform are required",
      });
    }

    // ── Check for duplicate (same user + same link) ──
    const existing = await VaultProblem.findOne({
      user: req.user.id,
      link: link.trim(),
    }).lean();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This problem is already in your vault",
      });
    }

    const vaultProblem = await VaultProblem.create({
      user: req.user.id,
      title: title.trim(),
      link: link.trim(),
      platform: platform.trim(),
      difficulty: difficulty || "Unknown",
      tags: tags || [],
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Problem added to vault",
      problem: vaultProblem,
    });

  } catch (err) {
    console.error("[Vault] createVaultProblem error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to add problem to vault",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/vault
// Get all vault problems for logged-in user
// Supports filtering by solved status + tag
// ─────────────────────────────────────────────
exports.getVaultProblems = async (req, res) => {
  try {
    // Build filter — always scoped to current user
    const filter = { user: req.user.id };

    // ?solved=true or ?solved=false
    if (req.query.solved !== undefined) {
      filter.solved = req.query.solved === "true";
    }

    // ?tag=arrays
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // ?difficulty=Hard
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    const problems = await VaultProblem.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // ── Build quick stats ──
    // Total, solved, unsolved counts for dashboard
    const totalCount = problems.length;
    const solvedCount = problems.filter((p) => p.solved).length;
    const unsolvedCount = totalCount - solvedCount;

    return res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        solved: solvedCount,
        unsolved: unsolvedCount,
      },
      problems,
    });

  } catch (err) {
    console.error("[Vault] getVaultProblems error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vault problems",
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/vault/:id/toggle
// Toggle solved/unsolved on a vault problem
// Also increments attemptCount each time
// ─────────────────────────────────────────────
exports.toggleSolved = async (req, res) => {
  try {
    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found in vault",
      });
    }

    // ── Security: only owner can toggle ──
    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own vault problems",
      });
    }

    // Toggle solved + track attempt
    problem.solved = !problem.solved;
    problem.attemptCount += 1;
    problem.lastAttemptedAt = new Date();

    await problem.save();

    return res.status(200).json({
      success: true,
      message: problem.solved ? "Marked as solved" : "Marked as unsolved",
      problem,
    });

  } catch (err) {
    console.error("[Vault] toggleSolved error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update problem",
    });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/vault/:id
// Remove a problem from vault
// ─────────────────────────────────────────────
exports.deleteVaultProblem = async (req, res) => {
  try {
    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found in vault",
      });
    }

    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own vault problems",
      });
    }

    await VaultProblem.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Problem removed from vault",
    });

  } catch (err) {
    console.error("[Vault] deleteVaultProblem error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete problem",
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/vault/:id/notes
// Update notes on a vault problem
// ─────────────────────────────────────────────
exports.updateNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({
        success: false,
        message: "Notes field is required",
      });
    }

    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own vault problems",
      });
    }

    problem.notes = notes;
    await problem.save();

    return res.status(200).json({
      success: true,
      message: "Notes updated",
      problem,
    });

  } catch (err) {
    console.error("[Vault] updateNotes error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update notes",
    });
  }
};

// PATCH /api/vault/:id/revision
exports.toggleRevision = async (req, res) => {
  try {
    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found",
      });
    }

    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your vault problem",
      });
    }

    problem.needsRevision = !problem.needsRevision;
    await problem.save();

    return res.status(200).json({
      success: true,
      needsRevision: problem.needsRevision,
      problem,
    });

  } catch (err) {
    console.error("[Vault] toggleRevision error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update revision status",
    });
  }
};

const Groq = require("groq-sdk");

exports.generateHints = async (req, res) => {
  try {
    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found in vault",
      });
    }

    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your vault problem",
      });
    }

    // Return cached hints if already generated
    if (problem.aiStatus === "completed" && problem.aiHints.length > 0) {
      return res.status(200).json({
        success: true,
        cached: true,
        hints: problem.aiHints,
        summary: problem.aiSummary,
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `
You are helping a student prepare for coding interviews.
They saved this problem to study later:

Title: ${problem.title}
Platform: ${problem.platform}
Difficulty: ${problem.difficulty}
Tags: ${(problem.tags || []).join(", ")}
Their notes: ${problem.notes || "None"}

Give them:
1. A 2 sentence summary of what this problem is testing
2. Three progressive hints (hint 1 = gentle, hint 2 = directional, hint 3 = strong clue)

Respond ONLY with this JSON, no other text:
{
  "summary": "...",
  "hints": ["hint1", "hint2", "hint3"]
}
    `.trim();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: "You are a coding mentor. Always respond with valid JSON only. No markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");

    const parsed = JSON.parse(jsonMatch[0]);

    problem.aiHints = parsed.hints || [];
    problem.aiSummary = parsed.summary || "";
    problem.aiStatus = "completed";
    await problem.save();

    return res.status(200).json({
      success: true,
      cached: false,
      hints: problem.aiHints,
      summary: problem.aiSummary,
    });

  } catch (err) {
    console.error("[Vault] generateHints error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate hints",
    });
  }
};