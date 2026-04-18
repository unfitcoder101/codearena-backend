const { runCpp } = require("./runners/cppRunner");
const { runJS } = require("./runners/jsRunner");
const { runJava } = require("./runners/javaRunner");

async function runCode(language, code, input) {
  switch (language) {
    case "cpp":
      return await runCpp(code, input);

    case "js":
      return await runJS(code, input);

    case "java":
      return await runJava(code, input);

    default:
      throw new Error("Unsupported language");
  }
}

module.exports = { runCode };