const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const TIME_LIMIT_MS = 10000;
const MEMORY_LIMIT = "256m";

async function runCpp(code, input = "") {
  const id = crypto.randomUUID();

  // Use /tmp directly — always writable on Mac
  const tmpDir = path.join("/tmp", `codearena_cpp_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const codeFile = path.join(tmpDir, "main.cpp");
  const inputFile = path.join(tmpDir, "input.txt");

  try {
    fs.writeFileSync(codeFile, code);
    fs.writeFileSync(inputFile, input);

    // Verify files were written
    if (!fs.existsSync(codeFile)) {
      throw new Error("Failed to write code file");
    }

    const dockerCmd = [
      "docker", "run",
      "--rm",
      "--network", "none",
      `--memory=${MEMORY_LIMIT}`,
      "--cpus=0.5",
      // No --read-only and no --tmpfs so the container
      // can write compiled binary freely
      "--ulimit", "nproc=100:100",
      "-v", `${tmpDir}:/code`,   // NOT read-only so output binary can be written
      "-w", "/code",
      "gcc:13",
      "/bin/sh", "-c",
      // Compile in /code directly — no tmp needed
      "g++ -O2 -o /code/main /code/main.cpp && /code/main < /code/input.txt"
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

    console.log("[CPP Runner] Running:", dockerCmd.join(" "));

    const proc = spawn(cmd, args);

    let stdout = "";
    let stderr = "";
    const MAX_OUTPUT = 64 * 1024;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT) {
        proc.kill("SIGKILL");
        reject(new Error("Output limit exceeded"));
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Time Limit Exceeded (10s)"));
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);

      console.log(`[CPP Runner] Exit code: ${exitCode}`);
      console.log(`[CPP Runner] stdout: ${stdout}`);
      console.log(`[CPP Runner] stderr: ${stderr}`);

      if (exitCode !== 0) {
        reject(new Error(stderr || stdout || `Exit code ${exitCode}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Docker error: ${err.message}`));
    });
  });
}

module.exports = { runCpp };