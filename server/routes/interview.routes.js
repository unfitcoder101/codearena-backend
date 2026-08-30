const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { interviewLimiter } = require("../middleware/submissionLimiter");
const {
  startInterview,
  sendMessage,
  getInterviewBySubmission,
} = require("../controllers/interview.controller");

router.use(protect);

router.post("/start", startInterview);
router.post("/:id/message", interviewLimiter, sendMessage);
router.get("/submission/:submissionId", getInterviewBySubmission);

module.exports = router;
