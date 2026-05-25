const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAllProblems,
  getProblemById,
  createProblem,
  getHint,
} = require("../controllers/problem.controller");
const {
  getAllProblems,
  getProblemById,
  createProblem,
  getHint,
  deleteProblem,
} = require("../controllers/problem.controller");

router.delete("/:id", protect, deleteProblem);
router.get("/", getAllProblems);
router.get("/:id", getProblemById);
router.post("/", protect, createProblem);
router.post("/:id/hint", protect, getHint);

module.exports = router;