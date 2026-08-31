const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ================= HELMET =================
app.use(helmet());

// ================= CORS =================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://codearena-frontend-lovat.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

// ================= RATE LIMITER =================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again later.",
  },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes.",
  },
});

// ================= JSON =================
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ================= Root =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CodeArena Backend is Live",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ================= Routes =================
const authRoutes = require("./routes/auth.routes");
const problemRoutes = require("./routes/problem.routes");
const submissionRoutes = require("./routes/submission.routes");
const vaultRoutes = require("./routes/vault.routes");
const analysisRoutes = require("./routes/analysis.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const interviewRoutes = require("./routes/interview.routes");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ================= 404 HANDLER =================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ================= GLOBAL ERROR HANDLER =================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Something went wrong on our end",
  });
});

module.exports = app;
