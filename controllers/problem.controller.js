const Problem = require("../models/Problem");

// GET ALL PROBLEMS
const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find();
    res.json(problems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE PROBLEM
const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    res.json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE PROBLEM (TEMP ADMIN)
const createProblem = async (req, res) => {
  try {
    const { title, description, difficulty } = req.body;

    const problem = await Problem.create({
      title,
      description,
      difficulty,
    });

    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProblems,
  getProblemById,
  createProblem,
};
