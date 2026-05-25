const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
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
router.post("/:id/hint", protect, getHint);
router.delete("/:id", protect, deleteProblem);

module.exports = router;