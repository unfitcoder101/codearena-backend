const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { submissionLimiter, runLimiter } = require("../middleware/submissionLimiter");
const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getSubmissionsByProblem,
  runCode_,
  updateSubmissionNotes,
} = require("../controllers/submission.controller");

router.use(protect);

router.post("/run", runLimiter, runCode_);
router.post("/", submissionLimiter, createSubmission);

router.get("/", getMySubmissions);
router.get("/problem/:problemId", getSubmissionsByProblem);
router.get("/:id", getSubmissionById);
router.patch("/:id/notes", updateSubmissionNotes);

module.exports = router;
