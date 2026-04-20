const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAnalysisBySubmissionId,
  getAnalysisStatus,
  getMyAnalysisHistory,
} = require("../controllers/analysis.controller");

router.use(protect);

router.get("/my/history", getMyAnalysisHistory);
router.get("/status/:submissionId", getAnalysisStatus);
router.get("/:submissionId", getAnalysisBySubmissionId);

module.exports = router;