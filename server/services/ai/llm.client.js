const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaude({ system, user, messages }, retryCount = 0) {
  try {
    let groqMessages;

    if (messages && Array.isArray(messages)) {
      groqMessages = messages;
    } else {
      groqMessages = [{ role: "user", content: user }];
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        { role: "system", content: system },
        ...groqMessages,
      ],
    });

    const text = response.choices[0]?.message?.content;

    if (!text || text.trim() === "") {
      throw new Error("Groq returned empty response");
    }

    return text;

  } catch (err) {
    const errMsg = err.message || "";

    if (errMsg.includes("429") || errMsg.includes("rate_limit")) {
      if (retryCount < MAX_RETRIES) {
        const wait = RETRY_DELAY_MS * (retryCount + 1);
        console.warn(`[LLM] Rate limited. Waiting ${wait}ms then retry ${retryCount + 1}/${MAX_RETRIES}`);
        await sleep(wait);
        return callClaude({ system, user, messages }, retryCount + 1);
      }
      throw new Error("Rate limit exceeded. Try again in a moment.");
    }

    if (errMsg.includes("500") || errMsg.includes("503")) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`[LLM] Server error. Retry ${retryCount + 1}/${MAX_RETRIES}`);
        await sleep(RETRY_DELAY_MS);
        return callClaude({ system, user, messages }, retryCount + 1);
      }
      throw new Error("Groq is temporarily unavailable.");
    }

    if (errMsg.includes("401") || errMsg.includes("invalid_api_key")) {
      throw new Error("Invalid Groq API key. Check GROQ_API_KEY in .env");
    }

    if (retryCount < 1) {
      console.warn("[LLM] Unknown error, retrying once:", errMsg);
      await sleep(RETRY_DELAY_MS);
      return callClaude({ system, user, messages }, retryCount + 1);
    }

    throw new Error(`Groq API error: ${errMsg}`);
  }
}

async function callClaudeWithCorrection({ system, user }, validationError) {
  const correctionPrompt = `
Your previous response failed JSON validation:
${validationError}

Return ONLY the corrected JSON. No explanation. No markdown. Just raw JSON.
  `.trim();

  return callClaude({
    system,
    user: user + "\n\n" + correctionPrompt,
  });
}

module.exports = { callClaude, callClaudeWithCorrection };
