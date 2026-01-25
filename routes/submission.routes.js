const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const Submission = require("../models/Submission");
const { createSubmission } = require("../controllers/submission.controller");

// ✅ Create submission (already working)
router.post("/", authMiddleware, createSubmission);

// 🔥 NEW: Get logged-in user's submissions
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user.id })
      .populate("problem", "title")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
