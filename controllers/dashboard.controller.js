const Submission = require("../models/Submission");
const Analysis = require("../models/Analysis");
const User = require("../models/User");
const VaultProblem = require("../models/VaultProblem");

// GET /api/dashboard
// Returns everything the dashboard needs in one call
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all DB queries in parallel — much faster than one by one
    const [user, recentSubmissions, recentAnalyses, vaultStats] = await Promise.all([
      // User basic stats
      User.findById(userId)
        .select("username solvedCount attemptCount weakPatterns createdAt")
        .lean(),

      // Last 20 submissions
      Submission.find({ user: userId })
        .populate("problem", "title difficulty tags")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),

      // Last 10 completed analyses for score trend
      Analysis.find({ userId, status: "completed" })
        .select("codeQualityScore mistakePattern completedAt submissionId")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Vault summary
      VaultProblem.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            solved: { $sum: { $cond: ["$solved", 1, 0] } },
          },
        },
      ]),
    ]);

    // ── Verdict breakdown ──
    const verdictCounts = { AC: 0, WA: 0, TLE: 0, CE: 0 };
    recentSubmissions.forEach((s) => {
      if (verdictCounts[s.status] !== undefined) {
        verdictCounts[s.status]++;
      }
    });

    // ── Success rate ──
    const totalJudged = recentSubmissions.filter((s) => s.status !== "PENDING").length;
    const successRate = totalJudged > 0
      ? Math.round((verdictCounts.AC / totalJudged) * 100)
      : 0;

    // ── Score trend (chronological for graph) ──
    const scoreTrend = recentAnalyses
      .filter((a) => a.codeQualityScore !== null)
      .map((a) => ({
        score: a.codeQualityScore,
        date: a.completedAt,
        submissionId: a.submissionId,
      }))
      .reverse();

    // ── Weak pattern detection ──
    const patternCounts = {};
    recentAnalyses.forEach((a) => {
      if (a.mistakePattern) {
        patternCounts[a.mistakePattern] = (patternCounts[a.mistakePattern] || 0) + 1;
      }
    });
    const weakPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => ({ pattern, count }));

    // ── Difficulty breakdown from recent submissions ──
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    recentSubmissions.forEach((s) => {
      if (s.problem && s.status === "AC") {
        const diff = s.problem.difficulty;
        if (difficultyStats[diff] !== undefined) difficultyStats[diff]++;
      }
    });

    // ── Recent activity (last 5 for feed) ──
    const recentActivity = recentSubmissions.slice(0, 5).map((s) => ({
      submissionId: s._id,
      problemTitle: s.problem?.title || "Unknown",
      problemDifficulty: s.problem?.difficulty || "Unknown",
      verdict: s.status,
      language: s.language,
      submittedAt: s.createdAt,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        solvedCount: user?.solvedCount || 0,
        attemptCount: user?.attemptCount || 0,
        successRate,
        verdictBreakdown: verdictCounts,
        difficultyBreakdown: difficultyStats,
      },
      vault: {
        total: vaultStats[0]?.total || 0,
        solved: vaultStats[0]?.solved || 0,
      },
      scoreTrend,
      weakPatterns,
      recentActivity,
    });

  } catch (err) {
    console.error("[Dashboard] getDashboardStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};