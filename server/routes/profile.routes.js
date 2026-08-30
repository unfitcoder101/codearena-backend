const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getProblems,
  getProblemById,
} = require("../controllers/problem.controller");

// These read-only routes are public
router.get("/", getProblems);
router.get("/:id", getProblemById);

// The unprotected createProblem that was here ("TEMP ADMIN") has been removed.
// Use POST /api/problems with an admin token instead.

module.exports = router;
