/**
 * response.parser.js
 *
 * Validates and cleans Claude's raw response.
 * Claude is instructed to return JSON but sometimes adds
 * extra text around it — we strip that and validate the structure.
 *
 * Uses Zod for schema validation — same as a TypeScript type but at runtime.
 */

const { z } = require("zod");

// ── The exact shape we expect from Claude ──
// If Claude's response doesn't match this, we reject it
// and ask Claude to fix it.
const AnalysisSchema = z.object({
  summary: z
    .string()
    .min(10, "Summary too short")
    .max(500, "Summary too long"),

  timeComplexity: z
    .string()
    .regex(/^O\(/, "Must be Big-O notation starting with O("),

  spaceComplexity: z
    .string()
    .regex(/^O\(/, "Must be Big-O notation starting with O("),

  verdict_reasoning: z
    .string()
    .min(5, "Verdict reasoning too short"),

  improvements: z
    .array(z.string().min(5))
    .min(1, "At least 1 improvement required")
    .max(5, "Max 5 improvements"),

  edgeCases: z
    .array(z.string())
    .min(0)
    .max(6, "Max 6 edge cases"),

  hints: z
    .array(z.string().min(5))
    .min(1, "At least 1 hint required")
    .max(3, "Max 3 hints"),

  codeQualityScore: z
    .number()
    .int("Must be an integer")
    .min(1, "Score minimum is 1")
    .max(10, "Score maximum is 10"),

  strengthsObserved: z
    .array(z.string())
    .min(1, "At least 1 strength required"),

  mistakePattern: z
    .string()
    .nullable()
    .optional(),
});

/**
 * Strips markdown code fences and extracts JSON from Claude's response.
 *
 * Claude sometimes wraps JSON in ```json ... ``` even when told not to.
 * This function finds the JSON no matter what's around it.
 */
function extractJSON(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty response from Claude");
  }

  let text = raw.trim();

  // Remove markdown code fences if present
  // Handles: ```json { ... } ``` or ``` { ... } ```
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Find the first { and last } to extract just the JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in Claude's response");
  }

  return text.slice(start, end + 1);
}

/**
 * Main parser — takes raw Claude text, extracts JSON, validates schema.
 *
 * Returns: { data, error }
 * If valid:   { data: { summary, timeComplexity, ... }, error: null }
 * If invalid: { data: null, error: "validation error message" }
 */
function parseAnalysis(rawResponse) {
  try {
    // Step 1: Extract the JSON string
    const jsonString = extractJSON(rawResponse);

    // Step 2: Parse it as JavaScript object
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (jsonErr) {
      return {
        data: null,
        error: `Invalid JSON syntax: ${jsonErr.message}`,
      };
    }

    // Step 3: Validate against our schema
    const result = AnalysisSchema.safeParse(parsed);

    if (!result.success) {
      // Format Zod errors into a readable string for the retry prompt
      const errorMessages = result.error.issues
        .map((issue) => `Field '${issue.path.join(".")}': ${issue.message}`)
        .join("; ");

      return {
        data: null,
        error: errorMessages,
      };
    }

    return {
      data: result.data,
      error: null,
    };

  } catch (err) {
    return {
      data: null,
      error: err.message,
    };
  }
}

module.exports = { parseAnalysis, AnalysisSchema };