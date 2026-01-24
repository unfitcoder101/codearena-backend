const express = require("express");
const router = express.Router();

const {
  getProblems,
  getProblemById,
  createProblem,
} = require("../controllers/problem.controller");

// PUBLIC
router.get("/", getProblems);
router.get("/:id", getProblemById);

// TEMP ADMIN (for now)
router.post("/", createProblem);

module.exports = router;
