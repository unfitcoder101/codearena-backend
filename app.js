const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS (simple & stable)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ JSON
app.use(express.json());

// ✅ Root check
app.get("/", (req, res) => {
  res.send("CodeArena Backend is Live");
});

// ✅ Routes
const authRoutes = require("./routes/auth.routes");
const problemRoutes = require("./routes/problem.routes");
const submissionRoutes = require("./routes/submission.routes");

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

module.exports = app;
