/**
 * opportunityIntelligence.js — Express routes for opportunity intelligence.
 *
 * Endpoints
 * ---------
 * GET  /api/opportunity-intelligence
 *   Returns the latest cached intelligence report (score, summary, analysis).
 *   If no cache exists yet, triggers a fresh collection automatically.
 *
 * POST /api/opportunity-intelligence/refresh
 *   Re-fetches from all federal opportunity databases and returns updated results.
 *   Accepts an optional JSON body:
 *     { "naicsCodes": ["541511", "541512"], "daysBack": 30 }
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { collectAndAnalyze, getCached } from "../services/intelligenceService.js";

const router = express.Router();

// GET /api/opportunity-intelligence
router.get("/", authenticateToken, async (req, res) => {
  try {
    const cached = getCached();
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    // No cache yet — run an initial collection
    const result = await collectAndAnalyze([], 30);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[opportunity-intelligence] GET error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve opportunity intelligence.",
    });
  }
});

// POST /api/opportunity-intelligence/refresh
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    const { naicsCodes = [], daysBack = 30 } = req.body || {};

    if (!Array.isArray(naicsCodes)) {
      return res.status(400).json({
        success: false,
        error: "naicsCodes must be an array of strings.",
      });
    }

    const result = await collectAndAnalyze(
      naicsCodes.map(String),
      Number(daysBack) || 30
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[opportunity-intelligence] POST /refresh error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to refresh opportunity intelligence.",
    });
  }
});

export default router;
