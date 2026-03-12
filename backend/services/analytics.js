import mongoose from "mongoose";
import User from "../models/User.js";
import Opportunity from "../models/Opportunity.js";
import EmailPreference from "../models/EmailPreference.js";

/**
 * Returns high-level dashboard KPIs.
 */
export async function getDashboardMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    adminUsers,
    totalOpportunities,
    savedOpportunities,
    emailPrefsEnabled
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ role: "admin" }),
    Opportunity.countDocuments({}),
    Opportunity.countDocuments({ "savedBy.0": { $exists: true } }),
    EmailPreference.countDocuments({ enabled: true })
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newThisMonth: newUsersThisMonth,
      admins: adminUsers
    },
    opportunities: {
      cached: totalOpportunities,
      saved: savedOpportunities
    },
    email: {
      subscribed: emailPrefsEnabled
    },
    generatedAt: now.toISOString()
  };
}

/**
 * Returns daily registration counts for the past N days.
 */
export async function getDailyRegistrations(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);

  return result.map((r) => ({
    date: `${r._id.year}-${String(r._id.month).padStart(2, "0")}-${String(r._id.day).padStart(2, "0")}`,
    registrations: r.count
  }));
}

/**
 * Returns the most popular NAICS codes across all user profiles.
 */
export async function getPopularNaicsCodes(limit = 20) {
  const result = await User.aggregate([
    { $unwind: "$naicsCodes" },
    { $group: { _id: "$naicsCodes", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  return result.map((r) => ({ naicsCode: r._id, userCount: r.count }));
}

/**
 * Returns saved-opportunity counts per NAICS code.
 */
export async function getSavedOpportunityTrends(limit = 20) {
  const result = await Opportunity.aggregate([
    { $match: { "savedBy.0": { $exists: true } } },
    { $group: { _id: "$naicsCode", saves: { $sum: { $size: "$savedBy" } }, opportunities: { $sum: 1 } } },
    { $sort: { saves: -1 } },
    { $limit: limit }
  ]);

  return result.map((r) => ({ naicsCode: r._id, totalSaves: r.saves, uniqueOpportunities: r.opportunities }));
}

/**
 * Returns feature usage breakdown.
 */
export async function getFeatureUsage() {
  const [usersWithNaics, usersWithEmail, opportunitiesSaved] = await Promise.all([
    User.countDocuments({ "naicsCodes.0": { $exists: true } }),
    EmailPreference.countDocuments({ enabled: true }),
    Opportunity.countDocuments({ "savedBy.0": { $exists: true } })
  ]);

  return {
    naicsCodeConfiguration: usersWithNaics,
    emailAlertsEnabled: usersWithEmail,
    opportunitiesSaved
  };
}

/**
 * Returns paginated user list with basic stats.
 */
export async function getUserList({ page = 1, limit = 20, search = "", role = null } = {}) {
  const query = {};
  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [{ email: regex }, { name: regex }, { company: regex }];
  }
  if (role) query.role = role;

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).select("-password -refreshToken").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

/**
 * Returns detailed stats for a single user.
 */
export async function getUserStats(userId) {
  const [user, emailPref, savedCount] = await Promise.all([
    User.findById(userId).select("-password -refreshToken"),
    EmailPreference.findOne({ user: userId }),
    Opportunity.countDocuments({ savedBy: userId })
  ]);

  if (!user) return null;

  return {
    user: user.toObject(),
    emailPreferences: emailPref,
    stats: {
      savedOpportunities: savedCount
    }
  };
}
