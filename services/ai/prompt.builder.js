/**
 * prompt.builder.js
 *
 * Builds the exact prompts we send to Claude.
 * Different verdicts = different focus in the prompt.
 * AC code still gets reviewed for quality + optimization.
 * WA code gets focused on the logical bug.
 * TLE code gets focused on complexity.
 * CE code gets focused on syntax/compilation issues.
 */

// The analysis JSON schema we force Claude to follow
const ANALYSIS_SCHEMA = {
  summary: "string — 2-3 sentences describing what the code does and the approach taken",
  timeComplexity: "string — Big-O notation e.g. O(n log n)",
  spaceComplexity: "string — Big-O notation e.g. O(n)",
  verdict_reasoning: "string — why this verdict makes sense given the code",
  improvements: "array of strings — 2-4 concrete code-level suggestions (not vague advice)",
  edgeCases: "array of strings — specific edge cases this code misses or handles poorly",
  hints: "array of 2 strings — hints toward a better solution, NO full solution given",
  codeQualityScore: "integer 1-10 where 5=works but messy, 7=interview-passable, 9=clean and optimal",
  strengthsObserved: "array of strings — what the user did well (always find something)",
  mistakePattern: "string or null — if a pattern is detected e.g. 'misses empty input', 'off-by-one errors', 'brute force habit'"
};

// Verdict-specific instructions so feedback is targeted, not generic
const VERDICT_INSTRUCTIONS = {
  AC: `
The code got Accepted. Focus on:
- Can this be further optimized (time or space)?
- Is the code clean and readable for an interview setting?
- Are there edge cases that happened to pass but are logically unhandled?
- Suggest the next level of thinking beyond this solution.
  `.trim(),

  WA: `
The code got Wrong Answer. Focus on:
- Identify the most likely logical bug causing the wrong output.
- Pinpoint the exact condition or calculation that is incorrect.
- Do NOT reveal the full fix — give a strong hint toward it.
- Mention which edge cases are likely causing the failure.
  `.trim(),

  TLE: `
The code got Time Limit Exceeded. Focus on:
- Identify the bottleneck — which loop/operation is too slow.
- Explain what complexity is needed to pass.
- Suggest a better algorithm or data structure.
- Be specific: "Replace your O(n²) nested loop with a HashMap for O(n)".
  `.trim(),

  CE: `
The code has a Compilation Error. Focus on:
- Identify the syntax or structural issue causing the error.
- Explain the fix clearly.
- Check for common mistakes: missing semicolons, wrong includes, mismatched brackets.
- Be encouraging — compilation errors are easy to fix.
  `.trim(),

  PENDING: `
Analyze the code on its own merits.
Give a full review of approach, complexity, quality, and improvements.
  `.trim()
};

/**
 * Builds the system prompt — sets Claude's persona once.
 * This never changes between submissions.
 */
function buildSystemPrompt() {
  return `
You are a senior software engineer and technical interviewer at a top tech company (FAANG level).
Your job is to give honest, specific, actionable code review feedback to someone preparing for technical interviews.

Your personality:
- Direct and honest — you don't sugarcoat bad code, but you're never discouraging
- Specific — you never say "improve your code", you say "replace your O(n²) loop at line X with a HashMap"
- Encouraging — you always find something the person did well
- Interview-focused — your feedback helps them perform better in real interviews

CRITICAL RULES:
1. You MUST respond with ONLY valid JSON — no explanation text before or after
2. The JSON must exactly match the schema provided
3. timeComplexity and spaceComplexity MUST use Big-O notation starting with "O("
4. codeQualityScore MUST be an integer between 1 and 10
5. hints must NOT contain the full solution — only guide toward it
6. improvements must be concrete and code-specific, not generic advice
7. If you cannot determine something, use null for that field
  `.trim();
}

/**
 * Builds the user prompt — unique per submission.
 * This is the actual question with all context.
 */
function buildUserPrompt({ problem, submission }) {
  const verdictInstruction = VERDICT_INSTRUCTIONS[submission.verdict] 
    || VERDICT_INSTRUCTIONS.PENDING;

  return `
## Problem
Title: ${problem.title}
Difficulty: ${problem.difficulty || "Unknown"}
Tags: ${(problem.tags || []).join(", ") || "None"}

## Problem Description
${problem.description || "No description provided"}

## Constraints
${problem.constraints || "No constraints provided"}

## Sample Input
${problem.sampleInput || "None"}

## Expected Output  
${problem.expectedOutput || "None"}

## Submission Details
Language: ${submission.language}
Verdict: ${submission.verdict}
${submission.errorMessage ? `Error Message: ${submission.errorMessage}` : ""}

## User's Code
\`\`\`${submission.language}
${submission.code}
\`\`\`

## Your Focus For This Review
${verdictInstruction}

## Required Response Schema
Respond with ONLY this JSON structure, no other text:
${JSON.stringify(ANALYSIS_SCHEMA, null, 2)}
  `.trim();
}

/**
 * Main export — call this to get the full prompt ready to send to Claude
 */
function buildPrompt({ problem, submission }) {
  return {
    system: buildSystemPrompt(),
    user: buildUserPrompt({ problem, submission }),
  };
}

module.exports = { buildPrompt, ANALYSIS_SCHEMA };