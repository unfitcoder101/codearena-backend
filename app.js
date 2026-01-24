const express = require("express");
const cors = require("cors");

const app = express();

/* =====================
   CORS (NO WILDCARDS)
===================== */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =====================
   BODY PARSER
===================== */
app.use(express.json());

/* =====================
   ROOT ROUTE
===================== */
app.get("/", (req, res) => {
  res.send("CodeArena Backend is Live");
});

/* =====================
   ROUTES
===================== */
const authRoutes = require("./routes/auth.routes");
const problemRoutes = require("./routes/problem.routes");
const submissionRoutes = require("./routes/submission.routes");

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

module.exports = app;
