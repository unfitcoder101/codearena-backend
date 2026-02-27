const express = require("express");
const router = express.Router();
const { getAnalysisBySubmissionId } = require("../controllers/analysis.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/:submissionId", authMiddleware, getAnalysisBySubmissionId);

module.exports = router;