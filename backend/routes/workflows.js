/**
 * Workflow Routes  –  /api/workflows
 * Multi-user workflow tracking for capture, procurement, proposal, and contract processes.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Workflow from "../models/Workflow.js";

const router = express.Router();

// ── GET /api/workflows ────────────────────────────────────────────
// List workflows the current user owns or is a member of
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {
      $or: [{ owner: req.user.id }, { members: req.user.id }],
      ...(status ? { status } : {}),
      ...(type ? { type } : {})
    };

    const total = await Workflow.countDocuments(filter);
    const workflows = await Workflow.find(filter)
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("owner", "name email")
      .populate("members", "name email");

    res.json({ success: true, total, page: Number(page), workflows });
  } catch (err) {
    console.error("Workflow list error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch workflows." });
  }
});

// ── POST /api/workflows ───────────────────────────────────────────
// Create a new workflow
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, type, opportunityId, opportunityTitle, memberIds, tags, dueDate } =
      req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: "title is required." });
    }

    const workflow = new Workflow({
      title,
      description,
      type: type || "general",
      opportunityId: opportunityId || null,
      opportunityTitle: opportunityTitle || "",
      owner: req.user.id,
      members: memberIds || [],
      tags: tags || [],
      dueDate: dueDate || null
    });

    await workflow.save();
    await workflow.populate("owner", "name email");
    await workflow.populate("members", "name email");

    res.status(201).json({ success: true, workflow });
  } catch (err) {
    console.error("Workflow create error:", err.message);
    res.status(500).json({ success: false, error: "Failed to create workflow." });
  }
});

// ── GET /api/workflows/:id ────────────────────────────────────────
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    })
      .populate("owner", "name email")
      .populate("members", "name email")
      .populate("tasks.assignedTo", "name email")
      .populate("tasks.comments.author", "name email");

    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found." });
    }

    res.json({ success: true, workflow });
  } catch (err) {
    console.error("Workflow get error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch workflow." });
  }
});

// ── PATCH /api/workflows/:id ──────────────────────────────────────
// Update workflow metadata (owner only)
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ _id: req.params.id, owner: req.user.id });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found or access denied." });
    }

    const allowed = ["title", "description", "type", "status", "memberIds", "tags", "dueDate"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "memberIds") {
          workflow.members = req.body.memberIds;
        } else {
          workflow[key] = req.body[key];
        }
      }
    }

    if (req.body.status === "completed" && !workflow.completedAt) {
      workflow.completedAt = new Date();
    }

    await workflow.save();
    await workflow.populate("owner", "name email");
    await workflow.populate("members", "name email");

    res.json({ success: true, workflow });
  } catch (err) {
    console.error("Workflow update error:", err.message);
    res.status(500).json({ success: false, error: "Failed to update workflow." });
  }
});

// ── DELETE /api/workflows/:id ─────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found or access denied." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Workflow delete error:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete workflow." });
  }
});

// ── POST /api/workflows/:id/tasks ────────────────────────────────
// Add a task to a workflow
router.post("/:id/tasks", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found." });
    }

    const { title, description, assignedTo, priority, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "task title is required." });

    workflow.tasks.push({
      title,
      description: description || "",
      assignedTo: assignedTo || null,
      priority: priority || "medium",
      dueDate: dueDate || null
    });

    await workflow.save();
    const task = workflow.tasks[workflow.tasks.length - 1];
    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Task create error:", err.message);
    res.status(500).json({ success: false, error: "Failed to add task." });
  }
});

// ── PATCH /api/workflows/:id/tasks/:taskId ────────────────────────
// Update a task (status, assignedTo, etc.)
router.patch("/:id/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found." });
    }

    const task = workflow.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: "Task not found." });

    const allowed = ["title", "description", "assignedTo", "status", "priority", "dueDate"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    }

    if (req.body.status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await workflow.save();
    res.json({ success: true, task });
  } catch (err) {
    console.error("Task update error:", err.message);
    res.status(500).json({ success: false, error: "Failed to update task." });
  }
});

// ── POST /api/workflows/:id/tasks/:taskId/comments ───────────────
// Add a comment to a task
router.post("/:id/tasks/:taskId/comments", authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { members: req.user.id }]
    });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found." });
    }

    const task = workflow.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: "Task not found." });

    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Comment text is required." });

    task.comments.push({ author: req.user.id, text });
    await workflow.save();
    const comment = task.comments[task.comments.length - 1];
    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("Comment create error:", err.message);
    res.status(500).json({ success: false, error: "Failed to add comment." });
  }
});

export default router;
