const Submission = require("../models/Submission");
const Analysis = require("../models/Analysis");
const User = require("../models/User");
const VaultProblem = require("../models/VaultProblem");
const Problem = require("../models/Problem");

// Computes current streak and longest streak from submission dates
function computeStreaks(submissions) {
  if (!submissions.length) return { current: 0, longest: 0 };

  // Get unique dates with activity — sorted newest first
  const dates = [...new Set(
    submissions.map((s) =>
      new Date(s.createdAt).toISOString().split("T")[0]
    )
  )].sort((a, b) => new Date(b) - new Date(a));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check if today or yesterday has activity
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString().split("T")[0];

  if (dates[0] !== today && dates[0] !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);
      const diffDays = Math.round(
        (current - next) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Compute longest streak
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i]);
    const next = new Date(dates[i + 1]);
    const diffDays = Math.round(
      (current - next) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak, 1);

  return { current: currentStreak, longest: longestStreak };
}

// Computes current streak and longest streak from submission dates
function computeStreaks(submissions) {
  if (!submissions.length) return { current: 0, longest: 0 };

  // Get unique dates with activity — sorted newest first
  const dates = [...new Set(
    submissions.map((s) =>
      new Date(s.createdAt).toISOString().split("T")[0]
    )
  )].sort((a, b) => new Date(b) - new Date(a));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check if today or yesterday has activity
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString().split("T")[0];

  if (dates[0] !== today && dates[0] !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);
      const diffDays = Math.round(
        (current - next) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Compute longest streak
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i]);
    const next = new Date(dates[i + 1]);
    const diffDays = Math.round(
      (current - next) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak, 1);

  return { current: currentStreak, longest: longestStreak };
}

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all queries in parallel
    const [user, recentSubmissions, recentAnalyses, vaultStats] =
      await Promise.all([
        User.findById(userId)
          .select("username solvedCount attemptCount weakPatterns createdAt")
          .lean(),

        Submission.find({ user: userId })
          .populate("problem", "title difficulty tags")
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),

        Analysis.find({ userId, status: "completed" })
          .select("codeQualityScore mistakePattern completedAt submissionId")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),

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

      const revisionCount = await VaultProblem.countDocuments({
  user: userId,
  needsRevision: true,
});

    // ── Verdict breakdown ──
    const verdictCounts = { AC: 0, WA: 0, TLE: 0, CE: 0 };
    recentSubmissions.forEach((s) => {
      if (verdictCounts[s.status] !== undefined) {
        verdictCounts[s.status]++;
      }
    });

    // ── Success rate ──
    const totalJudged = recentSubmissions.filter(
      (s) => s.status !== "PENDING"
    ).length;
    const successRate =
      totalJudged > 0
        ? Math.round((verdictCounts.AC / totalJudged) * 100)
        : 0;

    // ── Score trend ──
    const scoreTrend = recentAnalyses
      .filter((a) => a.codeQualityScore !== null)
      .map((a) => ({
        score: a.codeQualityScore,
        date: a.completedAt,
        submissionId: a.submissionId,
      }))
      .reverse();

    // ── Weak patterns ──
    const patternCounts = {};
    recentAnalyses.forEach((a) => {
      if (a.mistakePattern) {
        patternCounts[a.mistakePattern] =
          (patternCounts[a.mistakePattern] || 0) + 1;
      }
    });
    const weakPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => ({ pattern, count }));

    // ── Difficulty breakdown ──
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    recentSubmissions.forEach((s) => {
      if (s.problem && s.status === "AC") {
        const diff = s.problem.difficulty;
        if (difficultyStats[diff] !== undefined) difficultyStats[diff]++;
      }
    });

    // Difficulty progression over time
const diffProgression = recentSubmissions
  .slice(0, 20)
  .filter((s) => s.problem && s.status === "AC")
  .map((s) => ({
    date: new Date(s.createdAt).toISOString().split("T")[0],
    difficulty: s.problem.difficulty,
    title: s.problem.title,
  }))
  .reverse();

    // ── Recent activity ──
    const recentActivity = recentSubmissions.slice(0, 5).map((s) => ({
      submissionId: s._id,
      problemTitle: s.problem?.title || "Unknown",
      problemDifficulty: s.problem?.difficulty || "Unknown",
      verdict: s.status,
      language: s.language,
      submittedAt: s.createdAt,
    }));


    // ── Streak computation ──
    const allSubmissions = await Submission.find({ user: userId })
      .select("createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const streaks = computeStreaks(allSubmissions);

    // ── REAL RADAR DATA from actual submissions ──
    // For each topic tag, compute how many AC vs total submissions
    // the user has made on problems tagged with that topic
    const ALL_TOPICS = [
      "arrays",
      "strings",
      "dynamic-programming",
      "graphs",
      "trees",
      "binary-search",
      "math",
      "greedy",
    ];

    // Build a map of problemId → tags from submissions
    // We already have populated problem data in recentSubmissions
    const topicStats = {};
    ALL_TOPICS.forEach((t) => {
      topicStats[t] = { total: 0, ac: 0 };
    });

    recentSubmissions.forEach((s) => {
      if (!s.problem || !s.problem.tags) return;
      s.problem.tags.forEach((tag) => {
        const normalizedTag = tag.toLowerCase().replace(" ", "-");
        if (topicStats[normalizedTag] !== undefined) {
          topicStats[normalizedTag].total++;
          if (s.status === "AC") {
            topicStats[normalizedTag].ac++;
          }
        }
      });
    });

    // Convert to radar format
    // Score = accuracy percentage, minimum 5 so the radar shows something
    const radarData = ALL_TOPICS.map((topic) => {
      const stat = topicStats[topic];
      const score =
        stat.total === 0
          ? 0  // never attempted this topic
          : Math.round((stat.ac / stat.total) * 100);

      return {
        topic: formatTopicLabel(topic),
        score,
        total: stat.total,
        ac: stat.ac,
      };
    });

    // ── Difficulty progression over time ──
// Last 20 submissions showing Easy/Medium/Hard over time
    return res.status(200).json({
      success: true,
      stats: {
        solvedCount: user?.solvedCount || 0,
        attemptCount: user?.attemptCount || 0,
        successRate,
        diffProgression,
        verdictBreakdown: verdictCounts,
        difficultyBreakdown: difficultyStats,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      },
      vault: {
        total: vaultStats[0]?.total || 0,
        solved: vaultStats[0]?.solved || 0,
        needsRevision: revisionCount,
      },
      scoreTrend,
      weakPatterns,
      recentActivity,
      radarData,
      diffProgression  // real data now
    });

  } catch (err) {
    console.error("[Dashboard] getDashboardStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

// Convert "dynamic-programming" → "DP"
// Convert "binary-search" → "Binary Search"
function formatTopicLabel(topic) {
  const labels = {
    "arrays": "Arrays",
    "strings": "Strings",
    "dynamic-programming": "DP",
    "graphs": "Graphs",
    "trees": "Trees",
    "binary-search": "Binary Search",
    "math": "Math",
    "greedy": "Greedy",
  };
  return labels[topic] || topic;
}