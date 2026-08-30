/**
 * submissionLimiter.js
 *
 * Per-user rate limiter for submission and hint endpoints.
 * Keys on the logged-in user's ID instead of IP, since IP-only
 * limits are trivially bypassed with a VPN or mobile data switch.
 *
 * Runs AFTER protect middleware so req.user is already set.
 */

const rateLimit = require("express-rate-limit");

const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "You've reached the submission limit (20/hour). Please wait before submitting again.",
  },
  skip: (req) => req.path === "/run",
});

const runLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many run requests. Please slow down.",
  },
});

const hintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many hint requests. Limit is 30 per hour.",
  },
});

const interviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many interview messages. Limit is 50 per hour.",
  },
});

module.exports = {
  submissionLimiter,
  runLimiter,
  hintLimiter,
  interviewLimiter,
};
