/**
 * Capacity & Load Balancing Routes  –  /api/capacity
 * Forecasts team workload based on active workflows and deadlines.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Workflow from "../models/Workflow.js";
import User from "../models/User.js";

const router = express.Router();

// ── GET /api/capacity/overview ────────────────────────────────────
// Returns team-wide capacity snapshot
router.get("/overview", authenticateToken, async (req, res) => {
  try {
    // Active workflows per member
    const memberLoad = await Workflow.aggregate([
      { $match: { status: "active" } },
      { $unwind: { path: "$members", preserveNullAndEmpty: false } },
      { $group: { _id: "$members", activeWorkflows: { $sum: 1 } } },
      { $sort: { activeWorkflows: -1 } }
    ]);

    // Open tasks per assignee
    const taskLoad = await Workflow.aggregate([
      { $match: { status: "active" } },
      { $unwind: "$tasks" },
      {
        $match: {
          "tasks.status": { $in: ["pending", "in_progress"] },
          "tasks.assignedTo": { $ne: null }
        }
      },
      { $group: { _id: "$tasks.assignedTo", openTasks: { $sum: 1 } } },
      { $sort: { openTasks: -1 } }
    ]);

    // Enrich with user names
    const userIds = [...new Set([...memberLoad.map((m) => m._id), ...taskLoad.map((t) => t._id)])];
    const users = await User.find({ _id: { $in: userIds } }).select("name email");
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const enriched = memberLoad.map((m) => {
      const tasks = taskLoad.find((t) => t._id?.toString() === m._id?.toString());
      const user = userMap[m._id?.toString()];
      return {
        userId: m._id,
        name: user?.name || "Unknown",
        email: user?.email || "",
        activeWorkflows: m.activeWorkflows,
        openTasks: tasks?.openTasks ?? 0,
        loadScore: m.activeWorkflows * 20 + (tasks?.openTasks ?? 0) * 10
      };
    });

    // Threshold assessment
    const overloaded = enriched.filter((e) => e.loadScore > 100);
    const balanced = enriched.filter((e) => e.loadScore >= 40 && e.loadScore <= 100);
    const underutilized = enriched.filter((e) => e.loadScore < 40);

    res.json({
      success: true,
      team: enriched,
      summary: {
        overloaded: overloaded.length,
        balanced: balanced.length,
        underutilized: underutilized.length
      }
    });
  } catch (err) {
    console.error("Capacity overview error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load capacity overview." });
  }
});

// ── GET /api/capacity/forecast ────────────────────────────────────
// 30-day workflow deadline forecast
router.get("/forecast", authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingWorkflows = await Workflow.find({
      status: "active",
      dueDate: { $gte: now, $lte: in30Days }
    })
      .sort({ dueDate: 1 })
      .select("title type dueDate members tasks")
      .lean();

    // Group by week
    const weeks = [1, 2, 3, 4].map((w) => {
      const weekStart = new Date(now.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekWorkflows = upcomingWorkflows.filter(
        (wf) => wf.dueDate >= weekStart && wf.dueDate < weekEnd
      );
      return {
        week: w,
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        workflowsDue: weekWorkflows.length,
        totalTasks: weekWorkflows.reduce((sum, wf) => sum + (wf.tasks?.length ?? 0), 0),
        workflows: weekWorkflows.map((wf) => ({
          title: wf.title,
          type: wf.type,
          dueDate: wf.dueDate,
          taskCount: wf.tasks?.length ?? 0,
          memberCount: wf.members?.length ?? 0
        }))
      };
    });

    // Overdue workflows
    const overdue = await Workflow.find({
      status: "active",
      dueDate: { $lt: now }
    })
      .sort({ dueDate: 1 })
      .select("title type dueDate members")
      .lean();

    res.json({
      success: true,
      forecast: weeks,
      overdue: overdue.map((wf) => ({
        title: wf.title,
        type: wf.type,
        dueDate: wf.dueDate,
        daysOverdue: Math.floor((now - new Date(wf.dueDate)) / (1000 * 60 * 60 * 24))
      }))
    });
  } catch (err) {
    console.error("Capacity forecast error:", err.message);
    res.status(500).json({ success: false, error: "Failed to generate capacity forecast." });
  }
});

export default router;
