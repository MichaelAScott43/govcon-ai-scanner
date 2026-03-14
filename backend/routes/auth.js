import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import EmailPreference from "../models/EmailPreference.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

function generateTokens(userId) {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured.");

  const accessToken = jwt.sign({ id: userId }, secret, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: userId }, refreshSecret, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, company, naicsCodes } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }

    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      name: name?.trim() || "",
      company: company?.trim() || "",
      naicsCodes: Array.isArray(naicsCodes) ? naicsCodes : []
    });

    await user.save();

    // Create default email preferences for the new user
    await EmailPreference.create({ user: user._id });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Persist refresh token hash in DB rather than the raw token
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    user.refreshToken = refreshTokenHash;
    await user.save();

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toPublic()
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ success: false, error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toPublic()
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, error: "Login failed. Please try again." });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: "Refresh token required." });
    }

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ success: false, error: "Invalid refresh token." });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ success: true, ...tokens });
  } catch (error) {
    res.status(403).json({ success: false, error: "Invalid or expired refresh token." });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Logout failed." });
  }
});

// GET /api/auth/profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    res.json({ success: true, user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch profile." });
  }
});

// PATCH /api/auth/profile
router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, company, naicsCodes } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company.trim();
    if (Array.isArray(naicsCodes)) updates.naicsCodes = naicsCodes;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    res.json({ success: true, user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update profile." });
  }
});

export default router;
