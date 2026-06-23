const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  startInterview,
  sendMessage,
  getInterviewBySubmission,
} = require("../controllers/interview.controller");

router.use(protect);

// Start a new interview for a submission
router.post("/start", startInterview);

// Send a message and get AI response
router.post("/:id/message", sendMessage);

// Get existing interview by submission ID
router.get("/submission/:submissionId", getInterviewBySubmission);

module.exports = router;