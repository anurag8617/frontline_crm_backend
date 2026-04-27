const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { User } = require("../models");
const { protect } = require("../middleware/auth");

// Rate limit login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const user = await User.findOne({
      where: { username: username.toLowerCase().trim() },
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during login." });
  }
});

// GET /api/auth/me — verify token and return user
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName,
      role: req.user.role,
      lastLogin: req.user.lastLogin,
    },
  });
});

// POST /api/auth/logout
router.post("/logout", protect, (req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

module.exports = router;
