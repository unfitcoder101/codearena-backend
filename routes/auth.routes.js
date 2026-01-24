const express = require("express");
const router = express.Router();
const cors = require("cors");

const { register, login, me } = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");

// ✅ Handle CORS preflight explicitly
router.options("/register", cors());
router.options("/login", cors());
router.options("/me", cors());

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);

module.exports = router;
