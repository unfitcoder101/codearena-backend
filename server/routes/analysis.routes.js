const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAnalysisBySubmissionId,
  getAnalysisStatus,
  getMyAnalysisHistory,
} = require("../controllers/analysis.controller");

router.use(protect);

// my/history MUST be before /:submissionId
router.get("/my/history", getMyAnalysisHistory);

// status MUST be before /:submissionId  
router.get("/status/:submissionId", getAnalysisStatus);

// this catches everything else
router.get("/:submissionId", getAnalysisBySubmissionId);

module.exports = router;