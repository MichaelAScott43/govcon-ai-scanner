import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import EmailPreference from "../models/EmailPreference.js";
import User from "../models/User.js";
import { sendDailyDigest } from "../services/emailService.js";

const router = express.Router();

// GET /api/email-preferences — Get current user's email preferences
router.get("/preferences", authenticateToken, async (req, res) => {
  try {
    let prefs = await EmailPreference.findOne({ user: req.user.id });

    // Create defaults if they don't exist yet
    if (!prefs) {
      prefs = await EmailPreference.create({ user: req.user.id });
    }

    res.json({ success: true, preferences: prefs });
  } catch (error) {
    console.error("Get email preferences error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch email preferences." });
  }
});

// POST /api/email-preferences/update — Update email preferences
router.post("/preferences/update", authenticateToken, async (req, res) => {
  try {
    const { enabled, frequency, deliveryTime, naicsFilter, minBidScore } = req.body;

    const updates = {};
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (frequency !== undefined) updates.frequency = frequency;
    if (deliveryTime !== undefined) updates.deliveryTime = Number(deliveryTime);
    if (Array.isArray(naicsFilter)) updates.naicsFilter = naicsFilter;
    if (minBidScore !== undefined) updates.minBidScore = Number(minBidScore);

    const prefs = await EmailPreference.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, upsert: true }
    );

    res.json({ success: true, preferences: prefs });
  } catch (error) {
    console.error("Update email preferences error:", error.message);
    res.status(500).json({ success: false, error: "Failed to update email preferences." });
  }
});

// POST /api/email/send-daily-digest — Trigger daily digest for the current user (testing)
router.post("/send-daily-digest", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const result = await sendDailyDigest(user);
    res.json({ success: true, message: `Daily digest sent to ${user.email}.`, result });
  } catch (error) {
    console.error("Send daily digest error:", error.message);
    res.status(500).json({ success: false, error: error.message || "Failed to send daily digest." });
  }
});

export default router;
