const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const Submission = require("../models/Submission");

router.get("/me", authMiddleware, async (req, res) => {
  const submissions = await Submission.find({ user: req.user.id })
    .populate("problem", "title")
    .sort({ createdAt: -1 });

  res.json(submissions);
});

router.post("/", authMiddleware, require("../controllers/submission.controller").createSubmission);

module.exports = router;
