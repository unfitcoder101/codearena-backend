const express = require("express");
const cors = require("cors");

const app = express();

// ================= CORS =================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ================= JSON =================
app.use(express.json());

// ================= Root =================
app.get("/", (req, res) => {
  res.send("CodeArena Backend is Live");
});

// ================= Routes =================
const authRoutes = require("./routes/auth.routes");
const problemRoutes = require("./routes/problem.routes");
const submissionRoutes = require("./routes/submission.routes");
const vaultRoutes = require("./routes/vault.routes");
const analysisRoutes = require("./routes/analysis.routes");

app.use("/api/analysis", analysisRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/vault", vaultRoutes);

module.exports = app;
