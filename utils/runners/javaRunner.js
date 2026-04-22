const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const TIME_LIMIT_MS = 8000; // Java needs more time to start JVM
const MEMORY_LIMIT = "256m"; // Java needs more memory for JVM overhead

async function runJava(code, input = "") {
  const id = crypto.randomUUID();
  const tmpDir = path.join(os.tmpdir(), `codearena_java_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // ── IMPORTANT: Java file name MUST match class name ──
  // We force the class name to always be "Main"
  // If user wrote "public class Solution", we rename it to "Main"
  const fixedCode = code.replace(
    /public\s+class\s+\w+/,
    "public class Main"
  );

  const codeFile = path.join(tmpDir, "Main.java");
  const inputFile = path.join(tmpDir, "input.txt");

  try {
    fs.writeFileSync(codeFile, fixedCode);
    fs.writeFileSync(inputFile, input);

    // Java needs two commands: compile THEN run
    // We chain them with && so if compile fails, run never happens
    const dockerCmd = [
      "docker", "run",
      "--rm",
      "--network", "none",
      `--memory=${MEMORY_LIMIT}`,
      "--cpus=0.5",     // Java needs more tmp space for .class files
      "--ulimit", "nproc=100:100",     // JVM spawns more threads than C++/JS
      "--ulimit", "fsize=10485760",
      "-v", `${tmpDir}:/code`,
      "-w", "/tmp",
      "eclipse-temurin:21-alpine",
      "/bin/sh", "-c",
      [
        // Step 1: Compile → puts .class file in /tmp
        "javac -d /tmp /code/Main.java 2>&1",
        "&&",
        // Step 2: Run with JVM security flags
        // -Xmx128m         → max heap 128MB
        // -Xss4m           → stack size 4MB
        // -Djava.security.manager → enable security manager (blocks file/network access)
        "java",
        "-Xmx128m",
        "-Xss4m",
        "-cp", "/tmp",
        "Main",
        "< /code/input.txt"
      ].join(" ")
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
      reject(new Error("Time Limit Exceeded (8s)"));
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

module.exports = { runJava };