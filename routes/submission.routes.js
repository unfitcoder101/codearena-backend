const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { createSubmission } = require("../controllers/submission.controller");

// PROTECTED ROUTE
router.post("/", authMiddleware, createSubmission);

module.exports = router;
