const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/me", authMiddleware, (req, res) => {
    res.json({
        message: "This your protected profile",
        user: req.user
    });
});

module.exports = router;