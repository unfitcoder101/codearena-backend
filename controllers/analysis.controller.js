/**
 * analysis.controller.js
 *
 * All routes related to fetching AI analysis results.
 *
 * Routes:
 * GET /api/analysis/:submissionId        → get analysis for one submission
 * GET /api/analysis/status/:submissionId → lightweight status check (for polling)
 * GET /api/analysis/my/history          → all analyses for logged-in user
 */

const Analysis = require("../models/Analysis");
const Submission = require("../models/Submission");

// ─────────────────────────────────────────────
// GET /api/analysis/:submissionId
// Full analysis for one submission
// Frontend calls this when user clicks "View AI Feedback"
// ─────────────────────────────────────────────
exports.getAnalysisBySubmissionId = async (req, res) => {
  try {
    const { submissionId } = req.params;

    // ── Security: verify the submission belongs to this user ──
    // Without this, anyone can guess a submissionId and
    // read someone else's code + feedback
    const submission = await Submission.findById(submissionId).lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    if (submission.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this analysis",
      });
    }

    // ── Fetch the analysis ──
    const analysis = await Analysis.findOne({ submissionId }).lean();

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found for this submission",
      });
    }

    // ── Handle different states ──
    // Analysis exists but AI hasn't finished yet
    if (analysis.status === "pending") {
      return res.status(202).json({
        success: true,
        status: "pending",
        message: "AI is still analyzing your code. Check back in a few seconds.",
        analysis: null,
      });
    }

    // Analysis failed (Gemini error, etc.)
    if (analysis.status === "failed") {
      return res.status(200).json({
        success: true,
        status: "failed",
        message: "AI analysis failed for this submission.",
        error: analysis.errorMessage || "Unknown error",
        analysis: null,
      });
    }

    // ── Success — return full analysis ──
    return res.status(200).json({
      success: true,
      status: "completed",
      analysis: {
        summary: analysis.summary,
        timeComplexity: analysis.timeComplexity,
        spaceComplexity: analysis.spaceComplexity,
        verdictReasoning: analysis.verdictReasoning,
        improvements: analysis.improvements,
        edgeCases: analysis.edgeCases,
        hints: analysis.hints,
        codeQualityScore: analysis.codeQualityScore,
        strengthsObserved: analysis.strengthsObserved,
        mistakePattern: analysis.mistakePattern,
        completedAt: analysis.completedAt,
      },
    });

  } catch (err) {
    console.error("[Analysis] getAnalysisBySubmissionId error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analysis",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/analysis/status/:submissionId
// Lightweight status check — just pending/completed/failed
// Frontend polls this every 3 seconds after submission
// Much cheaper than fetching the full analysis every time
// ─────────────────────────────────────────────
exports.getAnalysisStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Only fetch the status field — don't load the whole document
    // This is fast because submissionId is indexed
    const analysis = await Analysis.findOne(
      { submissionId },
      { status: 1, errorMessage: 1 }  // projection: only these fields
    ).lean();

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found",
      });
    }

    return res.status(200).json({
      success: true,
      status: analysis.status,
      // Frontend uses this to decide: keep polling? show results? show error?
      shouldPoll: analysis.status === "pending",
      errorMessage: analysis.status === "failed" ? analysis.errorMessage : null,
    });

  } catch (err) {
    console.error("[Analysis] getAnalysisStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analysis status",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/analysis/my/history
// All analyses for the logged-in user
// Used in dashboard to show improvement over time
// ─────────────────────────────────────────────
exports.getMyAnalysisHistory = async (req, res) => {
  try {
    const analyses = await Analysis.find(
      {
        userId: req.user.id,
        status: "completed",    // only show finished ones
      },
      {
        // Only return fields needed for the dashboard list
        // Don't send full improvements/hints arrays — too heavy
        submissionId: 1,
        problemId: 1,
        codeQualityScore: 1,
        timeComplexity: 1,
        spaceComplexity: 1,
        mistakePattern: 1,
        completedAt: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })  // newest first
      .limit(50)
      .lean();

    // ── Build pattern summary ──
    // Count how many times each mistake pattern appears
    // This powers the "weak topics" feature on the dashboard
    const patternCounts = {};
    analyses.forEach((a) => {
      if (a.mistakePattern) {
        patternCounts[a.mistakePattern] =
          (patternCounts[a.mistakePattern] || 0) + 1;
      }
    });

    // Sort patterns by frequency
    const topMistakePatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    // ── Score trend ──
    // Last 10 quality scores so frontend can draw a graph
    const scoreTrend = analyses
      .slice(0, 10)
      .filter((a) => a.codeQualityScore !== null)
      .map((a) => ({
        score: a.codeQualityScore,
        date: a.completedAt || a.createdAt,
        submissionId: a.submissionId,
      }))
      .reverse(); // chronological order for the graph

    return res.status(200).json({
      success: true,
      count: analyses.length,
      topMistakePatterns,
      scoreTrend,
      analyses,
    });

  } catch (err) {
    console.error("[Analysis] getMyAnalysisHistory error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analysis history",
    });
  }
};