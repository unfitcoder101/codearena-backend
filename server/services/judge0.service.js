const axios = require("axios");

const LANGUAGE_IDS = {
  cpp: 54,
  js: 63,
  java: 62,
};

const JUDGE0_URL = "https://ce.judge0.com";

async function runWithJudge0(language, code, input = "") {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
    {
      source_code: Buffer.from(code).toString("base64"),
      language_id: languageId,
      stdin: Buffer.from(input).toString("base64"),
      cpu_time_limit: 5,
      memory_limit: 128000,
    },
    {
      headers: { "content-type": "application/json" },
    }
  );

  const token = submitRes.data.token;
  if (!token) throw new Error("No token from Judge0");

  // Poll for result
  for (let i = 0; i < 20; i++) {
    await sleep(500);

    const resultRes = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=*`
    );

    const result = resultRes.data;

    if (result.status.id <= 2) continue;

    const stdout = result.stdout
      ? Buffer.from(result.stdout, "base64").toString()
      : "";
    const stderr = result.stderr
      ? Buffer.from(result.stderr, "base64").toString()
      : "";
    const compileOutput = result.compile_output
      ? Buffer.from(result.compile_output, "base64").toString()
      : "";

    if (result.status.id === 6) throw new Error(compileOutput || "Compilation Error");
    if (result.status.id === 5) throw new Error("Time Limit Exceeded");
    if (result.status.id > 3 && !stdout) throw new Error(stderr || "Runtime Error");

    return stdout;
  }

  throw new Error("Judge0 timed out");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { runWithJudge0 };