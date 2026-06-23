const Interview = require("../models/Interview");
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
// POST /api/interviews/start
// Creates a new interview session for a submission
// First message is always from the AI interviewer
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

    // Check submission belongs to this user
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
        message: "Not your submission",
      });
    }

    // Check if interview already exists — return it if so
    const existing = await Interview.findOne({ submissionId });
    if (existing) {
      return res.status(200).json({
        success: true,
        interview: existing,
      });
    }

    const problem = await Problem.findById(submission.problem).lean();

    // Build the first interviewer message based on verdict
    // Different opening depending on whether they got AC or WA
    const openingMessage = buildOpeningMessage({
      problem,
      submission,
    });

    // Create interview with first AI message already in it
    const interview = await Interview.create({
      userId: req.user.id,
      submissionId,
      problemId: submission.problem,
      messages: [
        {
          role: "assistant",
          content: openingMessage,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      interview,
    });

  } catch (err) {
    console.error("[Interview] startInterview error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to start interview",
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/interviews/:id/message
// User sends a message — AI responds
// ─────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not your interview",
      });
    }

    // Add user message to conversation
    interview.messages.push({
      role: "user",
      content: message.trim(),
    });

    // Fetch context for the AI
    const submission = await Submission.findById(interview.submissionId).lean();
    const problem = await Problem.findById(interview.problemId).lean();

    // Build full conversation history for Groq
    // Groq needs the full history to maintain context
    const systemPrompt = buildInterviewerSystemPrompt({ problem, submission });

    const groqMessages = interview.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call Groq with full conversation history
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 300,  // keep responses concise like a real interviewer
      messages: [
        { role: "system", content: systemPrompt },
        ...groqMessages,
      ],
    });

    const aiReply = response.choices[0]?.message?.content;

    if (!aiReply) {
      throw new Error("Groq returned empty response");
    }

    // Add AI response to conversation
    interview.messages.push({
      role: "assistant",
      content: aiReply,
    });

    await interview.save();

    return res.status(200).json({
      success: true,
      reply: aiReply,
      messages: interview.messages,
    });

  } catch (err) {
    console.error("[Interview] sendMessage error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get AI response",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/interviews/submission/:submissionId
// Get existing interview for a submission
// ─────────────────────────────────────────────
exports.getInterviewBySubmission = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      submissionId: req.params.submissionId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "No interview found for this submission",
      });
    }

    return res.status(200).json({
      success: true,
      interview,
    });

  } catch (err) {
    console.error("[Interview] getInterviewBySubmission error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch interview",
    });
  }
};

// ─────────────────────────────────────────────
// Helper — builds the system prompt for the AI interviewer
// ─────────────────────────────────────────────
function buildInterviewerSystemPrompt({ problem, submission }) {
  return `
You are a senior software engineer conducting a technical interview at a top tech company.
The candidate just submitted a solution to a coding problem.

Problem: ${problem?.title || "Unknown"}
Description: ${problem?.description || ""}
Their verdict: ${submission?.verdict || "Unknown"}
Their language: ${submission?.language || "Unknown"}
Their code:
\`\`\`${submission?.language || ""}
${submission?.code || ""}
\`\`\`

Your job is to conduct a realistic technical interview about their solution.
Ask ONE question at a time. Keep responses under 3 sentences.
Be direct and professional — like a real FAANG interviewer.

Focus on:
- Understanding their thought process
- Time and space complexity
- Alternative approaches
- Edge cases they might have missed
- How they would optimize their solution

If their verdict was WA or CE, gently probe why they think it failed.
If their verdict was AC, challenge them to optimize further.

Never give away the answer directly. Ask guiding questions instead.
Never use bullet points. Speak naturally like a real person in an interview.
  `.trim();
}

// ─────────────────────────────────────────────
// Helper — builds the first message from the interviewer
// ─────────────────────────────────────────────
function buildOpeningMessage({ problem, submission }) {
  const verdictMessages = {
    AC: `Great, I can see your solution passed. Let's talk about it. Can you walk me through your approach to solving ${problem?.title}?`,
    WA: `I see your solution for ${problem?.title} didn't pass all test cases. Before we look at why, can you explain the approach you took?`,
    TLE: `Your solution for ${problem?.title} is timing out. Walk me through your current approach — what's the time complexity you think it has?`,
    CE: `Looks like there's a compilation error in your ${submission?.language} solution for ${problem?.title}. What do you think went wrong?`,
  };

  return verdictMessages[submission?.verdict] ||
    `Let's discuss your solution to ${problem?.title}. Walk me through your approach.`;
}