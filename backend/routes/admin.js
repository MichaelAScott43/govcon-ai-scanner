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
  getSystemHealth
  getDailyRegistrations,
  getPopularNaicsCodes,
  getSavedOpportunityTrends,
  getFeatureUsage,
  getUserList,
  getUserStats
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
// All admin routes require authentication + admin role + audit logging
router.use(authenticateToken, requireAdmin, auditLog);

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard — Key platform metrics
// ---------------------------------------------------------------------------
router.get("/dashboard", async (req, res) => {
  try {
    const metrics = await getDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);
    res.status(500).json({ success: false, error: "Failed to load dashboard metrics." });
  }
});

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

// GET /api/admin/users — Paginated, searchable user list
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", role } = req.query;
    const result = await getUserList({
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      search,
      role
    });
    res.json({ success: true, ...result });
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
// GET /api/admin/users/:id — Single user with usage stats
router.get("/users/:id", async (req, res) => {
  try {
    const stats = await getUserStats(req.params.id);
    if (!stats) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    res.json({ success: true, ...stats });
  } catch (error) {
    console.error("Admin user detail error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch user details." });
  }
});

// GET /api/admin/users/:id/activity — Saved opportunities (activity proxy)
router.get("/users/:id/activity", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("email name");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [opportunities, total] = await Promise.all([
      Opportunity.find({ savedBy: req.params.id })
        .select("noticeId title agency naicsCode postedDate cachedAt")
        .sort({ cachedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Opportunity.countDocuments({ savedBy: req.params.id })
    ]);

    res.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      activity: opportunities,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error("Admin user activity error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch user activity." });
  }
});

// PATCH /api/admin/users/:id — Update user details (admin override)
router.patch("/users/:id", async (req, res) => {
  try {
    const { name, company, naicsCodes, role, isActive } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company.trim();
    if (Array.isArray(naicsCodes)) updates.naicsCodes = naicsCodes;
    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role. Must be 'user' or 'admin'." });
      }
      updates.role = role;
    }
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields provided for update." });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, user });
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
// DELETE /api/admin/users/:id — Deactivate (soft-delete) a user
router.delete("/users/:id", async (req, res) => {
  try {
    // Prevent admins from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: "You cannot deactivate your own account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, refreshToken: null },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    res.json({ success: true, message: "User deactivated.", data: user });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, message: "User deactivated.", user });
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
// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// GET /api/admin/analytics/usage — Daily registration trends
router.get("/analytics/usage", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const data = await getDailyRegistrations(Math.min(Number(days), 365));
    res.json({ success: true, period: `${days}d`, data });
  } catch (error) {
    console.error("Admin analytics usage error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch usage analytics." });
  }
});

// GET /api/admin/analytics/revenue — Revenue and subscription breakdown
router.get("/analytics/revenue", async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [totalUsers, activeUsers, newUsersLast30Days] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    res.json({
      success: true,
      revenue: {
        note: "Connect your Stripe account to surface live MRR/ARR data here.",
        platformStats: {
          totalUsers,
          activeUsers,
          newUsersLast30Days,
          inactiveRate: totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers * 100).toFixed(1) + "%" : "0%"
        },
        generatedAt: now.toISOString()
      }
    });
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
// GET /api/admin/analytics/features — Feature adoption stats
router.get("/analytics/features", async (req, res) => {
  try {
    const data = await getFeatureUsage();
    res.json({ success: true, featureUsage: data });
  } catch (error) {
    console.error("Admin analytics features error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch feature analytics." });
  }
});

// GET /api/admin/analytics/search-trends — Popular NAICS codes
router.get("/analytics/search-trends", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const [naicsTrends, saveTrends] = await Promise.all([
      getPopularNaicsCodes(Number(limit)),
      getSavedOpportunityTrends(Number(limit))
    ]);
    res.json({ success: true, naicsCodesByUsers: naicsTrends, savedOpportunityTrends: saveTrends });
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
// GET /api/admin/analytics/export — Export user list as CSV or JSON
router.get("/analytics/export", async (req, res) => {
  try {
    const { format = "json" } = req.query;
    const { users } = await getUserList({ page: 1, limit: 10000 });

    if (format === "csv") {
      const header = "id,email,name,company,naicsCodes,role,isActive,createdAt\n";
      const rows = users
        .map((u) =>
          [
            u._id,
            `"${u.email}"`,
            `"${u.name}"`,
            `"${u.company}"`,
            `"${(u.naicsCodes || []).join(";")}"`,
            u.role,
            u.isActive,
            u.createdAt
          ].join(",")
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
      return res.send(header + rows);
    }

    res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.json"`);
    res.json({ success: true, exported: users.length, users });
  } catch (error) {
    console.error("Admin export error:", error.message);
    res.status(500).json({ success: false, error: "Failed to export data." });
  }
});

// ---------------------------------------------------------------------------
// Subscription Management
// ---------------------------------------------------------------------------

// GET /api/admin/subscriptions — All users with subscription context
router.get("/subscriptions", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find({}).select("email name company role isActive createdAt").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments({})
    ]);

    res.json({
      success: true,
      subscriptions: users.map((u) => ({
        userId: u._id,
        email: u.email,
        name: u.name,
        company: u.company,
        role: u.role,
        isActive: u.isActive,
        memberSince: u.createdAt
      })),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
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
// GET /api/admin/subscriptions/:userId — Single user subscription details
router.get("/subscriptions/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("email name company role isActive createdAt");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({
      success: true,
      subscription: {
        userId: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        isActive: user.isActive,
        memberSince: user.createdAt
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
    res.status(500).json({ success: false, error: "Failed to fetch subscription details." });
  }
});

// POST /api/admin/subscriptions/:userId/extend-trial — Extend demo trial
router.post("/subscriptions/:userId/extend-trial", async (req, res) => {
  try {
    const { days = 30, note = "" } = req.body;
    const user = await User.findById(req.params.userId).select("email name isActive");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Log trial extension
    console.log(
      JSON.stringify({
        type: "trial_extension",
        ts: new Date().toISOString(),
        admin: req.adminUser?.email,
        targetUser: user.email,
        days,
        note
      })
    );

    res.json({
      success: true,
      message: `Trial extended by ${days} days for ${user.email}.`,
      data: user
      user: { id: user._id, email: user.email, name: user.name },
      extension: { days: Number(days), note, extendedAt: new Date().toISOString() }
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
// POST /api/admin/subscriptions/:userId/issue-refund — Record refund (Stripe handled externally)
router.post("/subscriptions/:userId/issue-refund", async (req, res) => {
  try {
    const { amount, reason = "" } = req.body;
    const user = await User.findById(req.params.userId).select("email name");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Log refund action for audit trail
    console.log(
      JSON.stringify({
        type: "refund_action",
        ts: new Date().toISOString(),
        admin: req.adminUser?.email,
        targetUser: user.email,
        amount,
        reason
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
      message: `Refund of $${amount ?? "N/A"} recorded for ${user.email}. Process the actual refund in your Stripe dashboard.`,
      user: { id: user._id, email: user.email },
      refund: { amount, reason, recordedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error("Admin refund error:", error.message);
    res.status(500).json({ success: false, error: "Failed to record refund." });
  }
});

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

// GET /api/admin/health/system — Server metrics
router.get("/health/system", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    system: {
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      memory: {
        totalMB: Math.round(os.totalmem() / 1024 / 1024),
        freeMB: Math.round(os.freemem() / 1024 / 1024),
        usedPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      process: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal
      },
      env: process.env.NODE_ENV || "development",
      pid: process.pid
    }
  });
});

// GET /api/admin/health/integrations — Integration status
router.get("/health/integrations", async (req, res) => {
  const integrations = {
    mongodb: { status: "unconfigured", message: "MONGODB_URI not set" },
    samApi: { status: process.env.SAM_API_KEY ? "configured" : "unconfigured", message: process.env.SAM_API_KEY ? "SAM_API_KEY present" : "SAM_API_KEY not set" },
    stripe: { status: process.env.STRIPE_PAYMENT_LINK ? "configured" : "unconfigured", message: process.env.STRIPE_PAYMENT_LINK ? "Stripe payment link configured" : "STRIPE_PAYMENT_LINK not set" },
    email: { status: process.env.SMTP_HOST || process.env.EMAIL_HOST ? "configured" : "unconfigured", message: process.env.SMTP_HOST || process.env.EMAIL_HOST ? "SMTP configured" : "SMTP not configured" }
  };

  // Quick MongoDB connectivity check
  if (process.env.MONGODB_URI) {
    try {
      const mongoose = await import("mongoose");
      const state = mongoose.default.connection.readyState;
      integrations.mongodb = {
        status: state === 1 ? "connected" : state === 2 ? "connecting" : "disconnected",
        message: ["disconnected", "connected", "connecting", "disconnecting"][state] ?? "unknown"
      };
    } catch {
      integrations.mongodb = { status: "error", message: "Failed to check MongoDB status" };
    }
  }

  res.json({ success: true, integrations });
});

// GET /api/admin/logs — Recent structured log stub (production: wire to log aggregator)
router.get("/logs", (req, res) => {
  const { limit = 50, level = null } = req.query;
  res.json({
    success: true,
    message: "Live log streaming is available through your Datadog dashboard. This endpoint returns a placeholder in the current deployment.",
    hint: "Wire this to a log aggregation service (Datadog Logs, CloudWatch, etc.) for production use.",
    filters: { level, limit: Number(limit) },
    logs: []
  });
});

// POST /api/admin/system/restart — Graceful server restart (signals process manager)
router.post("/system/restart", (req, res) => {
  res.json({ success: true, message: "Restart signal sent. The server will restart momentarily." });
  // Allow the response to flush before exiting — process manager (e.g., render.com, pm2) will restart the process
  res.on("finish", () => {
    console.log(JSON.stringify({ type: "admin_restart", ts: new Date().toISOString(), admin: req.adminUser?.email }));
    process.exit(0);
  });
});

export default router;
