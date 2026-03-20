/**
 * Role Dashboard Routes  –  /api/dashboard
 * Returns aggregated KPIs tailored to each govcon role:
 *   capture | procurement | ops | exec
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Opportunity from "../models/Opportunity.js";
import Workflow from "../models/Workflow.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";

const router = express.Router();

// ── GET /api/dashboard/capture ────────────────────────────────────
router.get("/capture", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [saved, workflows, recentSaved] = await Promise.all([
      Opportunity.countDocuments({ savedBy: userId }),
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        type: "capture",
        status: "active"
      }),
      Opportunity.find({ savedBy: userId })
        .sort({ postedDate: -1 })
        .limit(5)
        .select("title agency responseDeadLine bidScore recommendation naicsCode")
    ]);

    // Win probability distribution (based on bid scores)
    const scoreDistribution = await Opportunity.aggregate([
      { $match: { savedBy: userId, bidScore: { $ne: null } } },
      {
        $bucket: {
          groupBy: "$bidScore",
          boundaries: [0, 40, 60, 75, 101],
          default: "no_score",
          output: { count: { $sum: 1 }, label: { $first: "$recommendation" } }
        }
      }
    ]);

    res.json({
      success: true,
      role: "capture",
      kpis: {
        savedOpportunities: saved,
        activeWorkflows: workflows,
        pipelineValue: saved * 250000
      },
      scoreDistribution,
      recentOpportunities: recentSaved
    });
  } catch (err) {
    console.error("Capture dashboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load capture dashboard." });
  }
});

// ── GET /api/dashboard/procurement ───────────────────────────────
router.get("/procurement", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [activeWorkflows, suppliers, pendingTasks] = await Promise.all([
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        type: "procurement",
        status: "active"
      }),
      Supplier.countDocuments({ status: "active" }),
      Workflow.aggregate([
        {
          $match: {
            $or: [{ owner: userId }, { members: userId }],
            status: "active"
          }
        },
        { $unwind: "$tasks" },
        {
          $match: {
            $or: [
              { "tasks.assignedTo": userId },
              { "tasks.status": { $in: ["pending", "in_progress"] } }
            ]
          }
        },
        { $count: "total" }
      ])
    ]);

    const supplierSummary = await Supplier.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, avgScore: { $avg: "$overallScore" } } }
    ]);

    res.json({
      success: true,
      role: "procurement",
      kpis: {
        activeWorkflows,
        activeSuppliers: suppliers,
        pendingTasks: pendingTasks[0]?.total ?? 0
      },
      supplierSummary
    });
  } catch (err) {
    console.error("Procurement dashboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load procurement dashboard." });
  }
});

// ── GET /api/dashboard/ops ────────────────────────────────────────
router.get("/ops", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [total, active, completed, paused] = await Promise.all([
      Workflow.countDocuments({ $or: [{ owner: userId }, { members: userId }] }),
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        status: "active"
      }),
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        status: "completed"
      }),
      Workflow.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        status: "paused"
      })
    ]);

    // Task completion rate
    const taskStats = await Workflow.aggregate([
      { $match: { $or: [{ owner: userId }, { members: userId }], status: "active" } },
      { $unwind: { path: "$tasks", preserveNullAndEmpty: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$tasks.status", "completed"] }, 1, 0] }
          }
        }
      }
    ]);

    const taskData = taskStats[0] || { total: 0, completed: 0 };
    const completionRate =
      taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0;

    res.json({
      success: true,
      role: "ops",
      kpis: {
        totalWorkflows: total,
        activeWorkflows: active,
        completedWorkflows: completed,
        pausedWorkflows: paused,
        taskCompletionRate: completionRate
      },
      taskStats: taskData
    });
  } catch (err) {
    console.error("Ops dashboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load ops dashboard." });
  }
});

// ── GET /api/dashboard/exec ───────────────────────────────────────
router.get("/exec", authenticateToken, async (req, res) => {
  try {
    const [totalUsers, totalOpps, totalSuppliers, workflowSummary] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Opportunity.countDocuments(),
      Supplier.countDocuments(),
      Workflow.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const supplierScore = await Supplier.aggregate([
      { $match: { overallScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$overallScore" }, count: { $sum: 1 } } }
    ]);

    // Opportunities by agency (top 5)
    const topAgencies = await Opportunity.aggregate([
      { $group: { _id: "$agency", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      role: "exec",
      kpis: {
        totalUsers,
        totalOpportunities: totalOpps,
        totalSuppliers,
        avgSupplierScore: Math.round(supplierScore[0]?.avg ?? 0)
      },
      workflowSummary,
      topAgencies
    });
  } catch (err) {
    console.error("Exec dashboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load exec dashboard." });
  }
});

export default router;
