/**
 * Mobile / Android API  –  /api/mobile
 * Provides Android-optimised endpoints with consistent envelope format,
 * pagination metadata, and device-friendly payload sizes.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Opportunity from "../models/Opportunity.js";
import Workflow from "../models/Workflow.js";
import Supplier from "../models/Supplier.js";

const router = express.Router();

// ── GET /api/mobile/health ────────────────────────────────────────
// Lightweight ping for mobile app startup / connectivity check
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    app: "GovCon AI Scanner",
    apiVersion: "2.0",
    mobileSdk: "android",
    serverTime: new Date().toISOString()
  });
});

// ── GET /api/mobile/me ────────────────────────────────────────────
// Compact user profile for mobile home screen
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const { id, email, name, company, role, naicsCodes } = req.user;
    res.json({
      success: true,
      user: { id, email, name, company, role, naicsCodes }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch profile." });
  }
});

// ── GET /api/mobile/opportunities ────────────────────────────────
// Paginated saved opportunities – compact payload for mobile list view
router.get("/opportunities", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const userId = req.user.id;

    const total = await Opportunity.countDocuments({ savedBy: userId });
    const opportunities = await Opportunity.find({ savedBy: userId })
      .sort({ postedDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("title agency naicsCode bidScore recommendation responseDeadLine uiLink noticeId")
      .lean();

    res.json({
      success: true,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      opportunities
    });
  } catch (err) {
    console.error("Mobile opps error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch opportunities." });
  }
});

// ── GET /api/mobile/workflows ─────────────────────────────────────
// Active workflows for the current user – mobile list view
router.get("/workflows", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const userId = req.user.id;

    const filter = { $or: [{ owner: userId }, { members: userId }], status: "active" };
    const total = await Workflow.countDocuments(filter);
    const workflows = await Workflow.find(filter)
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("title type status tasks dueDate updatedAt")
      .lean();

    const items = workflows.map((wf) => ({
      id: wf._id,
      title: wf.title,
      type: wf.type,
      status: wf.status,
      dueDate: wf.dueDate,
      updatedAt: wf.updatedAt,
      totalTasks: wf.tasks?.length ?? 0,
      completedTasks: wf.tasks?.filter((t) => t.status === "completed").length ?? 0
    }));

    res.json({
      success: true,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      workflows: items
    });
  } catch (err) {
    console.error("Mobile workflows error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch workflows." });
  }
});

// ── GET /api/mobile/suppliers ─────────────────────────────────────
// Top-scored suppliers for mobile view
router.get("/suppliers", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 15, search } = req.query;
    const filter = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort({ overallScore: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("name cage overallScore tier status contactName contactEmail")
      .lean();

    res.json({
      success: true,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      suppliers
    });
  } catch (err) {
    console.error("Mobile suppliers error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch suppliers." });
  }
});

// ── GET /api/mobile/summary ───────────────────────────────────────
// One-shot summary for mobile dashboard home screen
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [savedOpps, activeWorkflows, topSupplier] = await Promise.all([
      Opportunity.countDocuments({ savedBy: userId }),
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        status: "active"
      }),
      Supplier.findOne({ status: "active" }).sort({ overallScore: -1 }).select("name overallScore")
    ]);

    res.json({
      success: true,
      summary: {
        savedOpportunities: savedOpps,
        activeWorkflows,
        topSupplier: topSupplier
          ? { name: topSupplier.name, score: topSupplier.overallScore }
          : null
      }
    });
  } catch (err) {
    console.error("Mobile summary error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load summary." });
  }
});

export default router;
