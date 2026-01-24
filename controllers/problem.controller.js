const Problem = require("../models/Problem");

exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find();

    if (!problems || problems.length === 0) {
      return res.status(200).json([]); // return empty array instead of blank
    }

    res.status(200).json(problems);
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json(problem);
  } catch (error) {
    console.error("Error fetching problem by id:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createProblem = async (req, res) => {
  try {
    const problem = await Problem.create(req.body);
    res.status(201).json(problem);
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ error: error.message });
  }
};
