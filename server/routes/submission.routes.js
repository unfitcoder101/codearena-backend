const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getSubmissionsByProblem,
  runCode_,
  updateSubmissionNotes
} = require("../controllers/submission.controller");

router.use(protect);

// Run against sample input only — no submission saved
router.post("/run", runCode_);

// Submit against all hidden test cases
router.post("/", createSubmission);

// Get all my submissions
router.get("/", getMySubmissions);

// Get submissions for one problem
router.get("/problem/:problemId", getSubmissionsByProblem);

// Get one submission by ID
router.get("/:id", getSubmissionById);

// Add this route
router.patch("/:id/notes", updateSubmissionNotes);

module.exports = router;