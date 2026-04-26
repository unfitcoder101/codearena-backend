const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createVaultProblem,
  getVaultProblems,
  toggleSolved,
  deleteVaultProblem,
  updateNotes,
  generateHints,
  toggleRevision,
} = require("../controllers/vault.controller");

router.use(protect);

router.get("/", getVaultProblems);
router.post("/", createVaultProblem);
router.patch("/:id/toggle", toggleSolved);
router.patch("/:id/notes", updateNotes);
router.patch("/:id/revision", toggleRevision);
router.post("/:id/hints", generateHints);
router.delete("/:id", deleteVaultProblem);

module.exports = router;