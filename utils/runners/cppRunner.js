const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// How long we allow code to run before killing it (5 seconds)
const TIME_LIMIT_MS = 5000;

// How much memory the container gets (in megabytes)
const MEMORY_LIMIT = "128m";

async function runCpp(code, input = "") {
  // ── Step 1: Make a unique temp folder ──
  // Every submission gets its OWN folder so they never interfere with each other.
  // Like giving each student their own desk during an exam.
  const id = crypto.randomUUID();
  const tmpDir = path.join(os.tmpdir(), `codearena_cpp_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const codeFile = path.join(tmpDir, "main.cpp");
  const inputFile = path.join(tmpDir, "input.txt");

  try {
    // ── Step 2: Write files to temp folder ──
    fs.writeFileSync(codeFile, code);
    fs.writeFileSync(inputFile, input);

    // ── Step 3: Run inside Docker ──
    // Breaking down the docker command:
    // --rm               → delete the container after it finishes (no leftover junk)
    // --network none     → NO internet access inside the container
    // --memory           → max 128MB RAM (prevents memory bombs)
    // --cpus             → max 0.5 of one CPU core (prevents CPU bombs)
    // --read-only        → container filesystem is read-only
    // --tmpfs /tmp       → ONLY /tmp is writable, and only 10MB of it
    // --ulimit nproc=50  → max 50 processes (prevents fork bombs like while fork())
    // -v                 → mount our temp folder into the container so it can see the files
    const dockerCmd = [
      "docker", "run",
      "--rm",
      "--network", "none",
      `--memory=${MEMORY_LIMIT}`,
      "--cpus=0.5",
      "--read-only",
      "--tmpfs", "/tmp:size=10m,noexec",
      "--ulimit", "nproc=50:50",
      "--ulimit", "fsize=10485760",   // max file size 10MB
      "-v", `${tmpDir}:/code:ro`,     // mount code folder as READ-ONLY
      "-w", "/tmp",                   // work inside /tmp
      "gcc:13",
      "/bin/sh", "-c",
      // Compile from /code/main.cpp → output binary to /tmp/main
      // Then run it with the input file piped in
      "g++ -O2 -o /tmp/main /code/main.cpp 2>&1 && /tmp/main < /code/input.txt"
    ];

    return await runWithTimeout(dockerCmd, TIME_LIMIT_MS);

  } finally {
    // ── Step 4: ALWAYS clean up temp files ──
    // Even if something crashes, we delete the temp folder.
    // "finally" runs no matter what — success or failure.
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

// ── Timeout runner ──
// Runs the docker command but KILLS it if it takes too long.
// Like a chess clock — when time runs out, the move is cancelled.
function runWithTimeout(dockerCmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = dockerCmd;
    const proc = spawn(cmd, args);

    let stdout = "";
    let stderr = "";
    const MAX_OUTPUT = 64 * 1024; // 64KB max output

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      // If output is suspiciously huge, kill it
      // (prevents someone printing 1GB of output)
      if (stdout.length > MAX_OUTPUT) {
        proc.kill("SIGKILL");
        reject(new Error("Output limit exceeded (64KB max)"));
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Set the alarm clock
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Time Limit Exceeded (5s)"));
    }, timeoutMs);

    proc.on("close", (exitCode) => {
      clearTimeout(timer); // cancel the alarm — it finished in time

      if (exitCode !== 0) {
        // Non-zero exit = compilation error or runtime crash
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

module.exports = { runCpp };