const express = require("express");
const cors = require("cors");

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// ROOT ROUTE (sanity check)
app.get("/", (req, res) => {
  res.send("CodeArena Backend is Live");
});

// IMPORT ROUTES (ALL requires go here)
const problemRoutes = require("./routes/problem.routes");
const authRoutes = require("./routes/auth.routes");
const submissionRoutes = require("./routes/submission.routes");

// MOUNT ROUTES (AFTER imports)
app.use("/api/problems", problemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);

module.exports = app;
