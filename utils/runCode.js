const { runCpp } = require("./runners/cppRunner");
const { runJS } = require("./runners/jsRunner");
const { runJava } = require("./runners/javaRunner");

// ── Language registry ──
// To add a new language later, just add one line here.
// You don't have to touch the switch logic at all.
const RUNNERS = {
  cpp: runCpp,
  js: runJS,
  java: runJava,
};

// ── Timeout wrapper ──
// This is a safety alarm clock.
// If code takes longer than LIMIT milliseconds, we kill it.
// Without this, one infinite loop submission hangs your whole server.
const TIME_LIMIT_MS = 5000; // 5 seconds max per submission

function withTimeout(promise, ms, language) {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Time Limit Exceeded: ${language} code ran for more than ${ms / 1000}s`)),
      ms
    )
  );
  // Race: whichever finishes first wins.
  // If timeout wins, the code gets killed.
  return Promise.race([promise, timeout]);
}

// ── Main function ──
async function runCode(language, code, input = "") {
  const runner = RUNNERS[language];

  // Should never reach here because submission.controller validates first,
  // but this is a second safety net.
  if (!runner) {
    throw new Error(`Unsupported language: '${language}'`);
  }

  try {
    const output = await withTimeout(
      runner(code, input),
      TIME_LIMIT_MS,
      language
    );
    return output;
  } catch (err) {
    // Add context to the error so you know WHERE it came from
    // when reading logs later
    throw new Error(`[${language.toUpperCase()} Runner] ${err.message}`);
  }
}

// Export supported languages too — useful for validation elsewhere
const SUPPORTED_LANGUAGES = Object.keys(RUNNERS);

module.exports = { runCode, SUPPORTED_LANGUAGES };