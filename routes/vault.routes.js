const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const {
  createVaultProblem,
  getVaultProblems,
  toggleSolved,
} = require("../controllers/vault.controller");

router.post("/", authMiddleware, createVaultProblem);
router.get("/", authMiddleware, getVaultProblems);
router.patch("/:id/toggle", authMiddleware, toggleSolved);

module.exports = router;
