/**
 * Analytics Service
 *
 * Provides methods to compute key business metrics from the database.
 * All heavy queries are isolated here so routes stay thin.
 */

import mongoose from "mongoose";
import User from "../models/User.js";
import Opportunity from "../models/Opportunity.js";
import EmailPreference from "../models/EmailPreference.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOf(unit, offsetDays = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  if (unit === "month") d.setUTCDate(1);
  if (unit === "week") d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

/**
 * Returns an array of ISO date strings for the last `days` days (newest last).
 */
function lastNDays(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

// ---------------------------------------------------------------------------
// Dashboard — key metrics
// ---------------------------------------------------------------------------

export async function getDashboardMetrics() {
  const now = new Date();
  const startThisMonth = startOf("month");
  const startLastMonth = new Date(startThisMonth);
  startLastMonth.setUTCMonth(startLastMonth.getUTCMonth() - 1);
  const endLastMonth = new Date(startThisMonth);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    adminUsers,
    totalOpportunities,
    savedOpportunities,
    emailPrefs
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: startThisMonth } }),
    User.countDocuments({ createdAt: { $gte: startLastMonth, $lt: endLastMonth } }),
    User.countDocuments({ role: "admin" }),
    Opportunity.countDocuments(),
    Opportunity.countDocuments({ savedBy: { $exists: true, $not: { $size: 0 } } }),
    EmailPreference.countDocuments({ enabled: true })
  ]);

  // Monthly Active Users: active users who logged in (or refreshed token) in the last 30 days.
  // `updatedAt` is a reliable proxy because every login/token-refresh writes refreshToken to the DB.
  // For finer-grained tracking, add a dedicated `lastLoginAt` timestamp to the User schema.
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const mau = await User.countDocuments({
    isActive: true,
    updatedAt: { $gte: thirtyDaysAgo }
  });

  const growthRate =
    newUsersLastMonth > 0
      ? (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1)
      : newUsersThisMonth > 0
      ? "100.0"
      : "0.0";

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      newThisMonth: newUsersThisMonth,
      newLastMonth: newUsersLastMonth,
      growthRate: parseFloat(growthRate),
      mau
    },
    opportunities: {
      total: totalOpportunities,
      withSaves: savedOpportunities
    },
    email: {
      subscribed: emailPrefs
    }
  };
}

// ---------------------------------------------------------------------------
// Usage trends — daily registrations and activity
// ---------------------------------------------------------------------------

export async function getUsageTrends(days = 30) {
  const labels = lastNDays(days);
  const since = new Date(labels[0]);

  // New users per day
  const signupAgg = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    }
  ]);

  const signupMap = Object.fromEntries(signupAgg.map((r) => [r._id, r.count]));

  // Opportunities cached per day (proxy for search activity)
  const searchAgg = await Opportunity.aggregate([
    { $match: { cachedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$cachedAt" } },
        count: { $sum: 1 }
      }
    }
  ]);

  const searchMap = Object.fromEntries(searchAgg.map((r) => [r._id, r.count]));

  return {
    labels,
    registrations: labels.map((d) => signupMap[d] || 0),
    searches: labels.map((d) => searchMap[d] || 0)
  };
}

// ---------------------------------------------------------------------------
// Revenue analytics — subscription approximation
// (Without a Stripe webhook DB, we estimate from user data)
// ---------------------------------------------------------------------------

export async function getRevenueAnalytics() {
  // Approximate: count active, non-admin users as subscribers
  const [subscribers, churned] = await Promise.all([
    User.countDocuments({ isActive: true, role: "user" }),
    User.countDocuments({ isActive: false, role: "user" })
  ]);

  const pricePerMonth = 79; // $79/month
  const mrr = subscribers * pricePerMonth;
  const arr = mrr * 12;

  // Trend: new users per month for last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    return d;
  });

  const monthlyAgg = await User.aggregate([
    { $match: { createdAt: { $gte: months[0] } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        newUsers: { $sum: 1 }
      }
    }
  ]);

  const monthlyMap = Object.fromEntries(
    monthlyAgg.map((r) => [`${r._id.year}-${String(r._id.month).padStart(2, "0")}`, r.newUsers])
  );

  const labels = months.map((d) =>
    d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  );
  const keys = months.map((d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);

  return {
    mrr,
    arr,
    subscribers,
    churned,
    pricePerMonth,
    trend: {
      labels,
      newSubscribers: keys.map((k) => monthlyMap[k] || 0),
      revenue: keys.map((k) => (monthlyMap[k] || 0) * pricePerMonth)
    }
  };
}

// ---------------------------------------------------------------------------
// Feature usage — NAICS code popularity and email settings
// ---------------------------------------------------------------------------

export async function getFeatureUsage() {
  const [naicsAgg, emailFreqAgg, analysisCount] = await Promise.all([
    User.aggregate([
      { $unwind: "$naicsCodes" },
      { $group: { _id: "$naicsCodes", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    EmailPreference.aggregate([
      { $group: { _id: "$frequency", count: { $sum: 1 } } }
    ]),
    Opportunity.countDocuments({ bidScore: { $exists: true } })
  ]);

  return {
    topNaicsCodes: naicsAgg.map((r) => ({ code: r._id, users: r.count })),
    emailFrequency: Object.fromEntries(emailFreqAgg.map((r) => [r._id, r.count])),
    documentsAnalyzed: analysisCount
  };
}

// ---------------------------------------------------------------------------
// Search trends — popular keywords and NAICS from cached opportunities
// ---------------------------------------------------------------------------

export async function getSearchTrends() {
  const [topNaics, topAgencies, recentSearches] = await Promise.all([
    Opportunity.aggregate([
      { $match: { naicsCode: { $ne: null } } },
      { $group: { _id: "$naicsCode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    Opportunity.aggregate([
      { $match: { agency: { $ne: null } } },
      { $group: { _id: "$agency", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    Opportunity.find({}, "title naicsCode agency postedDate cachedAt")
      .sort({ cachedAt: -1 })
      .limit(10)
      .lean()
  ]);

  return {
    topNaicsCodes: topNaics.map((r) => ({ code: r._id, count: r.count })),
    topAgencies: topAgencies.map((r) => ({ agency: r._id, count: r.count })),
    recentOpportunities: recentSearches
  };
}

// ---------------------------------------------------------------------------
// System health
// ---------------------------------------------------------------------------

export async function getSystemHealth() {
  let mongoStatus = "unknown";
  let mongoLatencyMs = null;

  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    mongoLatencyMs = Date.now() - dbStart;
    mongoStatus = "healthy";
  } catch {
    mongoStatus = "unreachable";
  }

  const uptimeSeconds = process.uptime();
  const mem = process.memoryUsage();

  return {
    status: mongoStatus === "healthy" ? "healthy" : "degraded",
    uptime: {
      seconds: Math.round(uptimeSeconds),
      human: formatUptime(uptimeSeconds)
    },
    memory: {
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
      rssMB: (mem.rss / 1024 / 1024).toFixed(1)
    },
    integrations: {
      mongodb: { status: mongoStatus, latencyMs: mongoLatencyMs },
      samApi: { configured: !!process.env.SAM_API_KEY },
      stripe: { configured: !!process.env.STRIPE_PAYMENT_LINK },
      email: {
        configured: !!(process.env.GMAIL_USER || process.env.SENDGRID_API_KEY)
      }
    },
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development"
  };
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
