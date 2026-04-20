/**
 * llm.client.js
 *
 * Talks to Google Gemini (free tier).
 * Drop-in replacement for Claude — same function signatures,
 * same inputs, same outputs. Nothing else in the codebase changes.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize once — reused for all calls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-1.5-flash = free, fast, smart enough for code review
const MODEL = "gemini-1.5-flash";

// Retry config
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core function — calls Gemini with system + user prompt.
 * Returns raw text response.
 */
async function callClaude({ system, user }, retryCount = 0) {
  // We kept the function name "callClaude" on purpose —
  // so analyzer.runner.js doesn't need any changes at all.
  // Internally it calls Gemini. Nobody outside this file cares.

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: system,  // Gemini supports system prompts like this
    });

    const result = await model.generateContent(user);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === "") {
      throw new Error("Gemini returned empty response");
    }

    return text;

  } catch (err) {
    const errMsg = err.message || "";

    // Rate limit (429) — wait then retry
    if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      if (retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * (retryCount + 1) * 2;
        console.warn(`[LLM] Rate limited. Waiting ${waitTime}ms then retry ${retryCount + 1}/${MAX_RETRIES}`);
        await sleep(waitTime);
        return callClaude({ system, user }, retryCount + 1);
      }
      throw new Error("Gemini rate limit hit. You've exceeded free tier limits — wait a minute and try again.");
    }

    // Server error — retry
    if (errMsg.includes("500") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE")) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`[LLM] Gemini server error. Retry ${retryCount + 1}/${MAX_RETRIES}`);
        await sleep(RETRY_DELAY_MS);
        return callClaude({ system, user }, retryCount + 1);
      }
      throw new Error("Gemini is temporarily unavailable. Try again shortly.");
    }

    // Bad API key
    if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("401")) {
      throw new Error("Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.");
    }

    // Safety block — Gemini sometimes refuses code it thinks is harmful
    // (rare but happens with some system/security code)
    if (errMsg.includes("SAFETY") || errMsg.includes("blocked")) {
      throw new Error("Gemini blocked this request due to safety filters. Try rephrasing the code or problem description.");
    }

    // Unknown error — retry once
    if (retryCount < 1) {
      console.warn(`[LLM] Unknown Gemini error, retrying once:`, errMsg);
      await sleep(RETRY_DELAY_MS);
      return callClaude({ system, user }, retryCount + 1);
    }

    throw new Error(`Gemini API error: ${errMsg}`);
  }
}

/**
 * Calls Gemini with a self-correction request when first response
 * fails JSON validation.
 *
 * Called from analyzer.runner.js when parseAnalysis returns an error.
 */
async function callClaudeWithCorrection({ system, user }, validationError) {
  const correctionPrompt = `
Your previous response failed JSON validation with this error:
${validationError}

Return ONLY the corrected JSON object.
No explanation. No markdown. No code fences. Just raw JSON.
  `.trim();

  return callClaude({
    system,
    user: user + "\n\n" + correctionPrompt,
  });
}

module.exports = { callClaude, callClaudeWithCorrection };