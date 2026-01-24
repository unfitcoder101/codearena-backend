const express = require("express");
const cors = require("cors");

const app = express();

/**
 * ✅ REQUIRED for Render / proxy environments
 */
app.set("trust proxy", 1);

/**
 * ✅ SINGLE, CORRECT CORS CONFIG
 */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * ✅ MUST come AFTER cors
 */
app.use(express.json());

/**
 * ✅ Root sanity check
 */
app.get("/", (req, res) => {
  res.send("CodeArena Backend is Live");
});

/**
 * Routes
 */
const problemRoutes = require("./routes/problem.routes");
const authRoutes = require("./routes/auth.routes");
const submissionRoutes = require("./routes/submission.routes");

app.use("/api/problems", problemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);

module.exports = app;
