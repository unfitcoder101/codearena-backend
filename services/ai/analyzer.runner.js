/**
 * analyzer.runner.js
 *
 * The full AI analysis pipeline for one submission.
 * Called async after every submission — never blocks the judge response.
 *
 * Flow:
 * 1. Fetch submission + problem from DB
 * 2. Build prompt
 * 3. Call Claude
 * 4. Parse + validate response
 * 5. If invalid → ask Claude to self-correct (1 retry)
 * 6. Save to Analysis collection
 * 7. Update status: pending → completed (or failed)
 */

const Analysis = require("../../models/Analysis");
const Submission = require("../../models/Submission");
const Problem = require("../../models/Problem");

const { buildPrompt } = require("./prompt.builder");
const { callClaude, callClaudeWithCorrection } = require("./llm.client");
const { parseAnalysis } = require("./response.parser");

/**
 * Main entry point.
 * Called from submission.controller.js like:
 *   runAnalyzer(submission._id).catch(err => console.error(err))
 */
async function runAnalyzer(submissionId) {
  console.log(`[Analyzer] Starting analysis for submission: ${submissionId}`);

  // ── Step 1: Find the Analysis doc we created in the controller ──
  // It was created with status: "pending" — we update it when done
  const analysis = await Analysis.findOne({ submissionId });

  if (!analysis) {
    console.error(`[Analyzer] No analysis doc found for submission ${submissionId}`);
    return;
  }

  try {
    // ── Step 2: Fetch submission + problem together ──
    // .lean() = plain JS object, faster than full Mongoose document
    const submission = await Submission.findById(submissionId).lean();
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    const problem = await Problem.findById(submission.problem).lean();
    if (!problem) {
      throw new Error(`Problem ${submission.problem} not found`);
    }

    // ── Step 3: Build the prompt ──
    const prompt = buildPrompt({ problem, submission });

    // ── Step 4: Call Claude ──
    console.log(`[Analyzer] Calling Claude for ${submission.language} submission (verdict: ${submission.status})`);
    const rawResponse = await callClaude(prompt);

    // ── Step 5: Parse + validate ──
    let { data, error } = parseAnalysis(rawResponse);

    // ── Step 6: If validation failed, ask Claude to self-correct ──
    if (error) {
      console.warn(`[Analyzer] First response invalid: ${error}. Asking Claude to self-correct...`);

      const correctedResponse = await callClaudeWithCorrection(prompt, error);
      const corrected = parseAnalysis(correctedResponse);

      if (corrected.error) {
        // Both attempts failed — save what we have as failed
        throw new Error(`Claude failed validation twice. Last error: ${corrected.error}`);
      }

      data = corrected.data;
      console.log(`[Analyzer] Self-correction succeeded`);
    }

    // ── Step 7: Save the analysis to DB ──
    analysis.summary = data.summary;
    analysis.timeComplexity = data.timeComplexity;
    analysis.spaceComplexity = data.spaceComplexity;
    analysis.verdictReasoning = data.verdict_reasoning;
    analysis.improvements = data.improvements;
    analysis.edgeCases = data.edgeCases;
    analysis.hints = data.hints;
    analysis.codeQualityScore = data.codeQualityScore;
    analysis.strengthsObserved = data.strengthsObserved;
    analysis.mistakePattern = data.mistakePattern || null;
    analysis.status = "completed";
    analysis.completedAt = new Date();

    await analysis.save();

    console.log(`[Analyzer] Analysis completed for submission ${submissionId} — score: ${data.codeQualityScore}/10`);

  } catch (err) {
    // ── If anything fails, mark analysis as failed ──
    // We don't crash the server — we just record the failure
    console.error(`[Analyzer] Failed for submission ${submissionId}:`, err.message);

    try {
      analysis.status = "failed";
      analysis.errorMessage = err.message.slice(0, 500);
      await analysis.save();
    } catch (saveErr) {
      console.error(`[Analyzer] Could not even save failure status:`, saveErr.message);
    }
  }
}

module.exports = { runAnalyzer };