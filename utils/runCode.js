const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

exports.runCppCode = (code, input = "") => {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(process.cwd(), "temp");

    try {
      // 🔥 If temp exists but is a FILE, delete it
      if (fs.existsSync(tempDir) && !fs.lstatSync(tempDir).isDirectory()) {
        fs.unlinkSync(tempDir);
      }

      // ✅ Ensure directory
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (err) {
      return reject("Temp directory setup failed");
    }

    const fileId = Date.now();
    const cppFile = path.join(tempDir, `${fileId}.cpp`);
    const exeFile = path.join(tempDir, `${fileId}.out`);

    try {
      fs.writeFileSync(cppFile, code);
    } catch {
      return reject("File write error");
    }

    exec(`g++ ${cppFile} -o ${exeFile}`, (compileErr) => {
      if (compileErr) {
        return reject("Compilation Error");
      }

      const runProcess = exec(
        exeFile,
        { timeout: 3000 },
        (runErr, stdout, stderr) => {
          if (runErr) {
            if (runErr.killed) return reject("Time Limit Exceeded");
            return reject(stderr || "Runtime Error");
          }
          resolve(stdout.trim());
        }
      );

      runProcess.stdin.write(input);
      runProcess.stdin.end();
    });
  });
};
