const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAllProblems,
  getProblemById,
  createProblem,
} = require("../controllers/problem.controller");

router.get("/", getAllProblems);
router.get("/:id", getProblemById);
router.post("/", protect, createProblem);

module.exports = router;