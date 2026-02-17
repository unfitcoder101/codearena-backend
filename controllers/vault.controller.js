const VaultProblem = require("../models/VaultProblem");

// CREATE vault problem
exports.createVaultProblem = async (req, res) => {
  try {
    const { title, link, platform, difficulty, tags, notes } = req.body;

    const vaultProblem = await VaultProblem.create({
      user: req.user.id,
      title,
      link,
      platform,
      difficulty,
      tags,
      notes,
    });

    res.status(201).json(vaultProblem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all vault problems for logged user
exports.getVaultProblems = async (req, res) => {
  try {
    const problems = await VaultProblem.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(problems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TOGGLE solved
exports.toggleSolved = async (req, res) => {
  try {
    const problem = await VaultProblem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (problem.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    problem.solved = !problem.solved;
    await problem.save();

    res.json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
