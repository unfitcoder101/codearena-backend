const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

exports.runCppCode = (code, input = "") => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "../temp.cpp");
    const execPath = path.join(__dirname, "../a.out");

    fs.writeFileSync(filePath, code);

    exec(
      `g++ ${filePath} -o ${execPath} && echo "${input}" | ${execPath}`,
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      }
    );
  });
};
