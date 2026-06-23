const { runCpp } = require("./runners/cppRunner");
const { runJS } = require("./runners/jsRunner");
const { runJava } = require("./runners/javaRunner");
const { runWithJudge0 } = require("../services/judge0.service");

const RUNNERS = { cpp: runCpp, js: runJS, java: runJava };
const TIME_LIMIT_MS = 10000;

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Time Limit Exceeded")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function runCode(language, code, input = "") {
  if (process.env.NODE_ENV === "production") {
    console.log(`[Judge0] Running ${language}`);
    return await runWithJudge0(language, code, input);
  }

  const runner = RUNNERS[language];
  if (!runner) throw new Error(`Unsupported language: '${language}'`);
  return await withTimeout(runner(code, input), TIME_LIMIT_MS);
}

const SUPPORTED_LANGUAGES = Object.keys(RUNNERS);
module.exports = { runCode, SUPPORTED_LANGUAGES };