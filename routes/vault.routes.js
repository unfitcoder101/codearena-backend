const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { generateHints } = require("../controllers/vault.controller");
const {
  createVaultProblem,
  getVaultProblems,
  toggleSolved,
  deleteVaultProblem,
  updateNotes,
} = require("../controllers/vault.controller");

router.use(protect);

router.post("/:id/hints", generateHints);
router.get("/", getVaultProblems);
router.post("/", createVaultProblem);
router.patch("/:id/toggle", toggleSolved);
router.patch("/:id/notes", updateNotes);
router.delete("/:id", deleteVaultProblem);

module.exports = router;