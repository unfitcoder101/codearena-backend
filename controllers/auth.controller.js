const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ── Token generator helper ──
function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Validate inputs ──
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are all required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ── Check duplicate email ──
    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // ── Hash password ──
    // 12 rounds = strong enough, not too slow
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Create user ──
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

  } catch (err) {
    console.error("[Auth] Register error:", err);
    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ── Find user ──
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Same message for wrong email OR wrong password
      // Never tell attacker which one was wrong
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ── Check password ──
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      // Send user data so frontend doesn't need a separate /me call
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        solvedCount: user.solvedCount,
        attemptCount: user.attemptCount,
      },
    });

  } catch (err) {
    console.error("[Auth] Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// Returns logged-in user's profile
// ─────────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")   // never send password hash to frontend
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("[Auth] Me error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};