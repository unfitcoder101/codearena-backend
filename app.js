const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ================= HELMET =================
// Helmet puts a hard hat on your server.
// It adds security headers so browsers don't do dumb dangerous things.
app.use(helmet());

// ================= CORS =================
// This is the bouncer at the door.
// Only YOUR frontend is allowed in. Everyone else gets blocked.
const allowedOrigins = [
  "http://localhost:5173",  // your local React dev server (Vite default)
  "http://localhost:3000",  // in case you use port 3000
  process.env.FRONTEND_URL, // your deployed Vercel URL (set this in .env)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy blocked this origin: " + origin));
    },
    credentials: true,
  })
);

// ================= RATE LIMITER =================
// This is like a ticket counter.
// Each IP address gets max 100 requests per 15 minutes.
// After that, they get a "slow down" error until the timer resets.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again later.",
  },
});
app.use(globalLimiter);

// Stricter limiter for auth routes only (login/register)
// You only get 10 attempts per 15 minutes — stops brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes.",
  },
});

// ================= JSON =================
// Only accept request bodies up to 50KB.
// Without this, someone can send a 1GB payload and crash your server.
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

// Auth gets the stricter rate limiter
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/analysis", analysisRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/vault", vaultRoutes);

// ================= 404 HANDLER =================
// If someone hits a route that doesn't exist,
// send a clean error instead of crashing.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ================= GLOBAL ERROR HANDLER =================
// This is the safety net at the bottom.
// Any error thrown ANYWHERE in your app lands here.
// Without this, one crash takes down the whole server.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log it so you can debug (you'll improve this later with a proper logger)
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // CORS errors
  if (err.message && err.message.startsWith("CORS policy blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // Validation errors (from express-validator or zod)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Default: something unknown broke — don't leak internal details
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Something went wrong on our end",
  });
});

module.exports = app;