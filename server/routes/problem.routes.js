const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { hintLimiter } = require("../middleware/submissionLimiter");

const {
  getAllProblems,
  getProblemById,
  createProblem,
  getHint,
  deleteProblem,
} = require("../controllers/problem.controller");

// Public — anyone can browse problems
router.get("/", optionalAuth, getAllProblems);
router.get("/:id", optionalAuth, getProblemById);

// Protected — must be logged in
router.post("/", protect, createProblem);
router.delete("/:id", protect, deleteProblem);

// Hint hits Groq — rate limit per user to protect API costs
router.post("/:id/hint", protect, hintLimiter, getHint);

module.exports = router;
