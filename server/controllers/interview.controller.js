const Interview = require("../models/Interview");
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const { callClaude } = require("../services/ai/llm.client");

// ─────────────────────────────────────────────
// POST /api/interviews/start
// Creates a new interview session for a submission.
// First message is always from the AI interviewer.
// ─────────────────────────────────────────────
exports.startInterview = async (req, res) => {
  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message: "submissionId is required",
      });
    }

    const submission = await Submission.findById(submissionId).lean();
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    if (submission.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your submission" });
    }

    const existing = await Interview.findOne({ submissionId });
    if (existing) {
      return res.status(200).json({ success: true, interview: existing });
    }

    const problem = await Problem.findById(submission.problem).lean();
    const openingMessage = buildOpeningMessage({ problem, submission });

    const interview = await Interview.create({
      userId: req.user.id,
      submissionId,
      problemId: submission.problem,
      messages: [{ role: "assistant", content: openingMessage }],
    });

    return res.status(201).json({ success: true, interview });

  } catch (err) {
    console.error("[Interview] startInterview error:", err);
    return res.status(500).json({ success: false, message: "Failed to start interview" });
  }
};

// ─────────────────────────────────────────────
// POST /api/interviews/:id/message
// User sends a message — AI responds.
// ─────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const userMessage = message.trim().slice(0, 2000);

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your interview" });
    }

    interview.messages.push({ role: "user", content: userMessage });

    const submission = await Submission.findById(interview.submissionId).lean();
    const problem = await Problem.findById(interview.problemId).lean();

    const systemPrompt = buildInterviewerSystemPrompt({ problem, submission });

    const groqMessages = interview.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const aiReply = await callClaude({
      system: systemPrompt,
      messages: groqMessages,
    });

    interview.messages.push({ role: "assistant", content: aiReply });
    await interview.save();

    return res.status(200).json({
      success: true,
      reply: aiReply,
      messages: interview.messages,
    });

  } catch (err) {
    console.error("[Interview] sendMessage error:", err);
    return res.status(500).json({ success: false, message: "Failed to get AI response" });
  }
};

// ─────────────────────────────────────────────
// GET /api/interviews/submission/:submissionId
// ─────────────────────────────────────────────
exports.getInterviewBySubmission = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      submissionId: req.params.submissionId,
      userId: req.user.id,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "No interview found for this submission",
      });
    }

    return res.status(200).json({ success: true, interview });

  } catch (err) {
    console.error("[Interview] getInterviewBySubmission error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch interview" });
  }
};

// ─────────────────────────────────────────────
// Helper: system prompt — uses submission.status (real field name)
// ─────────────────────────────────────────────
function buildInterviewerSystemPrompt({ problem, submission }) {
  return `
You are a senior software engineer conducting a technical interview.

Problem: ${problem?.title || "Unknown"}
Description: ${problem?.description || ""}
Verdict: ${submission?.status || "Unknown"}
Language: ${submission?.language || "Unknown"}
Code:
\`\`\`${submission?.language || ""}
${submission?.code || ""}
\`\`\`

Ask ONE question at a time. Keep responses under 3 sentences.
Be direct like a real FAANG interviewer. No bullet points.
Focus on: their thought process, time/space complexity, edge cases, alternative approaches.
If verdict was WA/CE/TLE, probe why they think it failed.
If verdict was AC, challenge them to optimize further.
Never give away the answer. Ask guiding questions instead.
  `.trim();
}

// ─────────────────────────────────────────────
// Helper: opening message — uses submission.status (real field name)
// ─────────────────────────────────────────────
function buildOpeningMessage({ problem, submission }) {
  const verdictMessages = {
    AC:  `Great, your solution for ${problem?.title} passed. Walk me through your approach.`,
    WA:  `Your solution for ${problem?.title} didn't pass all test cases. Before we look at why — walk me through the approach you took.`,
    TLE: `Your solution for ${problem?.title} is timing out. What time complexity do you think your current approach has?`,
    CE:  `There's a compilation error in your ${submission?.language} solution for ${problem?.title}. What do you think went wrong?`,
  };

  return verdictMessages[submission?.status]
    || `Let's discuss your solution to ${problem?.title}. Walk me through your approach.`;
}
