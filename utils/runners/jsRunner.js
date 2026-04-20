const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const TIME_LIMIT_MS = 5000;
const MEMORY_LIMIT = "128m";

async function runJS(code, input = "") {
  const id = crypto.randomUUID();
  const tmpDir = path.join(os.tmpdir(), `codearena_js_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const codeFile = path.join(tmpDir, "main.js");
  const inputFile = path.join(tmpDir, "input.txt");

  try {
    // ── Wrap user code in a safe input reader ──
    // In competitive coding, you read from stdin.
    // We inject a helper so users can do: const lines = input()
    // This also DISABLES dangerous globals like process.exit
    // and prevents require() from loading dangerous modules.
    const safeWrapper = `
'use strict';

// Read all stdin upfront and expose as helper
const _inputData = require('fs').readFileSync('/code/input.txt', 'utf8').trim();
const _inputLines = _inputData ? _inputData.split('\\n') : [];
let _lineIndex = 0;

// Helper functions users can call in their code
const readline = () => _inputLines[_lineIndex++] || '';
const input = readline; // alias

// Block dangerous stuff
process.exit = () => {};
process.abort = () => {};

// ── USER CODE STARTS HERE ──
${code}
// ── USER CODE ENDS HERE ──
`;

    fs.writeFileSync(codeFile, safeWrapper);
    fs.writeFileSync(inputFile, input);

    const dockerCmd = [
      "docker", "run",
      "--rm",
      "--network", "none",
      `--memory=${MEMORY_LIMIT}`,
      "--cpus=0.5",
      "--read-only",
      "--tmpfs", "/tmp:size=10m,noexec",
      "--ulimit", "nproc=50:50",
      "--ulimit", "fsize=10485760",
      "-v", `${tmpDir}:/code:ro`,
      "-w", "/tmp",
      "node:20-alpine",
      "node", "--disallow-code-generation-from-strings",  // blocks eval() abuse
      "/code/main.js"
    ];

    return await runWithTimeout(dockerCmd, TIME_LIMIT_MS);

  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function runWithTimeout(dockerCmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = dockerCmd;
    const proc = spawn(cmd, args);

    let stdout = "";
    let stderr = "";
    const MAX_OUTPUT = 64 * 1024;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT) {
        proc.kill("SIGKILL");
        reject(new Error("Output limit exceeded (64KB max)"));
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Time Limit Exceeded (5s)"));
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      if (exitCode !== 0) {
        reject(new Error(stderr || stdout || "Runtime Error"));
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start Docker: ${err.message}. Is Docker running?`));
    });
  });
}

module.exports = { runJS };