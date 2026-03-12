/**
 * Admin Routes  —  /api/admin/*
 *
 * All routes require a valid JWT **and** admin role (enforced by requireAdmin).
 *
 * Sections:
 *  1. User Management
 *  2. Analytics & Insights
 *  3. Subscription Management
 *  4. System Health
 */

import express from "express";
import requireAdmin from "../middleware/admin.js";
import User from "../models/User.js";
import Opportunity from "../models/Opportunity.js";
import EmailPreference from "../models/EmailPreference.js";
import {
  getDashboardMetrics,
  getUsageTrends,
  getRevenueAnalytics,
  getFeatureUsage,
  getSearchTrends,
  getSystemHealth
} from "../services/analytics.js";

const router = express.Router();

// Apply admin guard to every route in this file
router.use(requireAdmin);

// ===========================================================================
// 1. USER MANAGEMENT
// ===========================================================================

// GET /api/admin/users
// List all users with pagination, search, and filters
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Admin users list error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch users." });
  }
});

// GET /api/admin/users/:id
// User details with usage stats
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
// User activity log (opportunities saved, email pref changes)
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
        activity: {
          savedOpportunities,
          accountCreated: user.createdAt,
          lastProfileUpdate: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Admin user activity error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch activity." });
  }
});

// PATCH /api/admin/users/:id
// Update user (admin override: role, isActive, name, company, naicsCodes)
router.patch("/users/:id", async (req, res) => {
  try {
    const allowed = ["name", "company", "naicsCodes", "role", "isActive"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update." });
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
// Deactivate a user (soft delete — sets isActive = false)
router.delete("/users/:id", async (req, res) => {
  try {
    // Prevent admins from deactivating their own account
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
// Key metrics: MAU, new users, opportunities, email subscriptions
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
// Daily/weekly usage trends
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
// Subscription revenue breakdown
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
// Feature usage statistics
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
// Popular searches, NAICS codes, agencies
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
// All active subscriptions (active, non-admin users)
router.get("/subscriptions", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: "user" };
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("email name company naicsCodes isActive createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    const pricePerMonth = 79;
    const data = users.map((u) => ({
      ...u,
      subscription: {
        status: u.isActive ? "active" : "cancelled",
        plan: "professional",
        monthlyPrice: pricePerMonth
      }
    }));

    res.json({
      success: true,
      data,
      summary: {
        total,
        active: data.filter((u) => u.isActive).length,
        mrr: data.filter((u) => u.isActive).length * pricePerMonth
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("Admin subscriptions error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch subscriptions." });
  }
});

// GET /api/admin/subscriptions/:userId
// Individual user subscription details
router.get("/subscriptions/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("email name company isActive createdAt updatedAt")
      .lean();

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const emailPref = await EmailPreference.findOne({ user: user._id }).lean();
    const savedCount = await Opportunity.countDocuments({ savedBy: user._id });

    res.json({
      success: true,
      data: {
        ...user,
        subscription: {
          status: user.isActive ? "active" : "cancelled",
          plan: "professional",
          monthlyPrice: 79
        },
        usage: { savedOpportunities: savedCount },
        emailPreferences: emailPref
      }
    });
  } catch (error) {
    console.error("Admin subscription detail error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch subscription." });
  }
});

// POST /api/admin/subscriptions/:userId/extend-trial
// Extend trial for a prospect (re-activates account)
router.post("/subscriptions/:userId/extend-trial", async (req, res) => {
  try {
    const { days = 30, reason = "" } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    ).select("email name isActive");

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    console.log(
      JSON.stringify({
        type: "TRIAL_EXTENDED",
        adminId: req.user.id,
        targetUserId: req.params.userId,
        days,
        reason,
        timestamp: new Date().toISOString()
      })
    );

    res.json({
      success: true,
      message: `Trial extended by ${days} days for ${user.email}.`,
      data: user
    });
  } catch (error) {
    console.error("Admin extend trial error:", error.message);
    res.status(500).json({ success: false, error: "Failed to extend trial." });
  }
});

// POST /api/admin/subscriptions/:userId/issue-refund
// Log a refund request (Stripe refund must be processed via Stripe dashboard)
router.post("/subscriptions/:userId/issue-refund", async (req, res) => {
  try {
    const { amount, reason = "" } = req.body;

    const user = await User.findById(req.params.userId).select("email name").lean();
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    // Log the refund request for audit trail
    console.log(
      JSON.stringify({
        type: "REFUND_REQUESTED",
        adminId: req.user.id,
        targetUserId: req.params.userId,
        targetEmail: user.email,
        amount: amount || "unspecified",
        reason,
        timestamp: new Date().toISOString(),
        note: "Process refund in Stripe dashboard"
      })
    );

    res.json({
      success: true,
      message: `Refund request logged for ${user.email}. Process via Stripe dashboard.`,
      data: { userId: user._id, email: user.email, amount, reason }
    });
  } catch (error) {
    console.error("Admin refund error:", error.message);
    res.status(500).json({ success: false, error: "Failed to process refund request." });
  }
});

// ===========================================================================
// 4. SYSTEM HEALTH
// ===========================================================================

// GET /api/admin/health/system
// Server metrics, uptime, memory
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
// SAM API, Stripe, email service status
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
// System logs — returns recent admin audit entries from in-memory buffer
// (In production, query Datadog or your log aggregator instead)
router.get("/logs", (req, res) => {
  res.json({
    success: true,
    message: "Logs are emitted to stdout/Datadog. Query your log aggregator for full history.",
    data: {
      hint: "Set DD_ENABLED=true to stream logs to Datadog, or pipe stdout to a log service.",
      recentAdminActions: "See server stdout for ADMIN_ACTION, TRIAL_EXTENDED, and REFUND_REQUESTED entries."
    }
  });
});

// POST /api/admin/system/restart
// Graceful soft restart — returns 200 then exits (process manager should restart)
router.post("/system/restart", (req, res) => {
  console.log(
    JSON.stringify({
      type: "SYSTEM_RESTART",
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    })
  );

  res.json({ success: true, message: "Graceful restart initiated." });

  // Flush the response, then perform a clean shutdown.
  // The process manager (PM2 / Render) will restart the service automatically.
  res.on("finish", () => {
    process.exit(0);
  });
});

export default router;
