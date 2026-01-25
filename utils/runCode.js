const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

exports.runCppCode = (code, input = "") => {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const id = Date.now();
    const cppFile = path.join(tempDir, `${id}.cpp`);
    const exeFile = path.join(tempDir, `${id}.out`);

    fs.writeFileSync(cppFile, code);

    // Compile
    exec(`g++ ${cppFile} -o ${exeFile}`, (compileErr) => {
      if (compileErr) {
        return reject("Compilation Error");
      }

      // Run with INPUT
      const run = exec(
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

      // 👇 PASS INPUT HERE
      if (input) {
        run.stdin.write(input);
      }
      run.stdin.end();
    });
  });
};
