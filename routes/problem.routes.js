const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const {
  getAllProblems,
  getProblemById,
  createProblem,
  getHint,
  deleteProblem,
} = require("../controllers/problem.controller");

router.get("/", getAllProblems);
router.get("/:id", getProblemById);
router.post("/", protect, createProblem);
router.delete("/:id", protect, deleteProblem);
router.post("/:id/hint", protect, getHint);

router.get("/", optionalAuth, getAllProblems);

module.exports = router;  