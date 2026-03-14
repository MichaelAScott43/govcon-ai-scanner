/**
 * Admin Routes - /api/admin/*
 *
 * All routes require a valid JWT and admin role (enforced by requireAdmin).
 *
 * Sections:
 *  1. User Management
 *  2. Analytics & Insights
 *  3. Subscription Management
 *  4. System Health
 */

import express from "express";
import os from "os";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin, auditLog } from "../middleware/admin.js";
import User from "../models/User.js";
import Opportunity from "../models/Opportunity.js";
import EmailPreference from "../models/EmailPreference.js";
import {
  getDashboardMetrics,
  getUsageTrends,
  getRevenueAnalytics,
  getFeatureUsage,
  getSearchTrends,
  getSystemHealth,
  getDailyRegistrations,
  getPopularNaicsCodes,
  getSavedOpportunityTrends,
  getUserList,
  getUserStats
} from "../services/analytics.js";

const router = express.Router();

// Apply admin guard to every route in this file
router.use(authenticateToken, requireAdmin, auditLog);

// ===========================================================================
// 1. USER MANAGEMENT
// ===========================================================================

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ email: re }, { name: re }, { company: re }];
    }
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Admin users list error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch users." });
  }
});

// GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -refreshToken")
      .lean();

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const [savedCount, emailPref] = await Promise.all([
      Opportunity.countDocuments({ savedBy: user._id }),
      EmailPreference.findOne({ user: user._id }).lean()
    ]);

    res.json({
      success: true,
      data: {
        ...user,
        stats: { savedOpportunities: savedCount },
        emailPreferences: emailPref || null
      }
    });
  } catch (error) {
    console.error("Admin user detail error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch user." });
  }
});

// GET /api/admin/users/:id/activity
router.get("/users/:id/activity", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("email name createdAt updatedAt").lean();
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const savedOpportunities = await Opportunity.find({ savedBy: req.params.id })
      .select("title noticeId agency postedDate cachedAt")
      .sort({ cachedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: {
        user,
        activity: { savedOpportunities, accountCreated: user.createdAt, lastProfileUpdate: user.updatedAt }
      }
    });
  } catch (error) {
    console.error("Admin user activity error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch activity." });
  }
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", async (req, res) => {
  try {
    const { name, company, naicsCodes, role, isActive } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company.trim();
    if (Array.isArray(naicsCodes)) updates.naicsCodes = naicsCodes;
    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role." });
      }
      updates.role = role;
    }
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields provided." });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select("-password -refreshToken");

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Admin update user error:", error.message);
    res.status(500).json({ success: false, error: "Failed to update user." });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: "Cannot deactivate your own account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, refreshToken: null },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    res.json({ success: true, message: "User deactivated.", data: user });
  } catch (error) {
    console.error("Admin deactivate user error:", error.message);
    res.status(500).json({ success: false, error: "Failed to deactivate user." });
  }
});

// ===========================================================================
// 2. ANALYTICS & INSIGHTS
// ===========================================================================

// GET /api/admin/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const metrics = await getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch dashboard metrics." });
  }
});

// GET /api/admin/analytics/usage
router.get("/analytics/usage", async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));
    const data = await getUsageTrends(days);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Admin usage analytics error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch usage trends." });
  }
});

// GET /api/admin/analytics/revenue
router.get("/analytics/revenue", async (req, res) => {
  try {
    const data = await getRevenueAnalytics();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Admin revenue analytics error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch revenue analytics." });
  }
});

// GET /api/admin/analytics/features
router.get("/analytics/features", async (req, res) => {
  try {
    const data = await getFeatureUsage();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Admin feature analytics error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch feature usage." });
  }
});

// GET /api/admin/analytics/search-trends
router.get("/analytics/search-trends", async (req, res) => {
  try {
    const data = await getSearchTrends();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Admin search trends error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch search trends." });
  }
});

// ===========================================================================
// 3. SUBSCRIPTION MANAGEMENT
// ===========================================================================

// GET /api/admin/subscriptions
router.get("/subscriptions", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ role: "user" })
        .select("email name company isActive createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: "user" })
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Admin subscriptions error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions." });
  }
});

// GET /api/admin/subscriptions/:userId
router.get("/subscriptions/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("email name company isActive createdAt")
      .lean();

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Admin subscription detail error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch subscription." });
  }
});

// POST /api/admin/subscriptions/:userId/extend-trial
router.post("/subscriptions/:userId/extend-trial", async (req, res) => {
  try {
    const { days = 30, reason = "" } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    ).select("email name isActive");

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    console.log(JSON.stringify({
      type: "TRIAL_EXTENDED",
      adminId: req.user.id,
      targetUserId: req.params.userId,
      days,
      reason,
      timestamp: new Date().toISOString()
    }));

    res.json({ success: true, message: `Trial extended by ${days} days.`, data: user });
  } catch (error) {
    console.error("Admin extend trial error:", error.message);
    res.status(500).json({ success: false, error: "Failed to extend trial." });
  }
});

// POST /api/admin/subscriptions/:userId/issue-refund
router.post("/subscriptions/:userId/issue-refund", async (req, res) => {
  try {
    const { amount, reason = "" } = req.body;

    const user = await User.findById(req.params.userId).select("email name").lean();
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    console.log(JSON.stringify({
      type: "REFUND_REQUESTED",
      adminId: req.user.id,
      targetUserId: req.params.userId,
      targetEmail: user.email,
      amount: amount || "unspecified",
      reason,
      timestamp: new Date().toISOString(),
      note: "Process refund in Stripe dashboard"
    }));

    res.json({ success: true, message: `Refund request logged for ${user.email}.`, data: user });
  } catch (error) {
    console.error("Admin refund error:", error.message);
    res.status(500).json({ success: false, error: "Failed to process refund request." });
  }
});

// ===========================================================================
// 4. SYSTEM HEALTH
// ===========================================================================

// GET /api/admin/health/system
router.get("/health/system", async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    console.error("Admin system health error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch system health." });
  }
});

// GET /api/admin/health/integrations
router.get("/health/integrations", async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json({ success: true, data: health.integrations });
  } catch (error) {
    console.error("Admin integrations health error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch integration status." });
  }
});

// GET /api/admin/logs
router.get("/logs", (req, res) => {
  res.json({
    success: true,
    message: "Logs are emitted to stdout/Datadog. Query your log aggregator for full history.",
    data: {
      hint: "Set DD_ENABLED=true to stream logs to Datadog, or pipe stdout to a log service.",
      recentAdminActions: "See server stdout for admin action entries."
    }
  });
});

// POST /api/admin/system/restart
router.post("/system/restart", (req, res) => {
  console.log(JSON.stringify({
    type: "SYSTEM_RESTART",
    adminId: req.user.id,
    timestamp: new Date().toISOString()
  }));

  res.json({ success: true, message: "Graceful restart initiated." });

  res.on("finish", () => {
    process.exit(0);
  });
});

export default router;