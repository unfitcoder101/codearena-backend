const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  getSubmissionsByProblem,
} = require("../controllers/submission.controller");

router.use(protect);

router.post("/", createSubmission);
router.get("/", getMySubmissions);
router.get("/:id", getSubmissionById);
router.get("/problem/:problemId", getSubmissionsByProblem);

module.exports = router;