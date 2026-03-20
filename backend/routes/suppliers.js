/**
 * Supplier Scorecard Routes  –  /api/suppliers
 * CRUD for supplier records and KPI-based scoring.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Supplier from "../models/Supplier.js";

const router = express.Router();

// ── GET /api/suppliers ────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { search, status, tier, page = 1, limit = 20 } = req.query;
    const filter = {
      ...(status ? { status } : {}),
      ...(tier ? { tier } : {}),
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { cage: { $regex: search, $options: "i" } },
              { dunsUei: { $regex: search, $options: "i" } }
            ]
          }
        : {})
    };

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort({ overallScore: -1, name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), suppliers });
  } catch (err) {
    console.error("Supplier list error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch suppliers." });
  }
});

// ── POST /api/suppliers ───────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name, cage, dunsUei, naicsCodes, contactName, contactEmail, contactPhone,
      tier, status, kpis, certifications, pastPerformanceRating,
      activeContracts, totalContractValue, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "supplier name is required." });
    }

    const supplier = new Supplier({
      name, cage, dunsUei, naicsCodes, contactName, contactEmail, contactPhone,
      tier, status, kpis: kpis || [], certifications: certifications || [],
      pastPerformanceRating: pastPerformanceRating || "",
      activeContracts: activeContracts || 0,
      totalContractValue: totalContractValue || 0,
      notes: notes || "",
      createdBy: req.user.id
    });

    await supplier.save();
    res.status(201).json({ success: true, supplier });
  } catch (err) {
    console.error("Supplier create error:", err.message);
    res.status(500).json({ success: false, error: "Failed to create supplier." });
  }
});

// ── GET /api/suppliers/:id ────────────────────────────────────────
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    if (!supplier) return res.status(404).json({ success: false, error: "Supplier not found." });
    res.json({ success: true, supplier });
  } catch (err) {
    console.error("Supplier get error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch supplier." });
  }
});

// ── PATCH /api/suppliers/:id ──────────────────────────────────────
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: "Supplier not found." });

    const allowed = [
      "name", "cage", "dunsUei", "naicsCodes", "contactName", "contactEmail", "contactPhone",
      "tier", "status", "kpis", "certifications", "pastPerformanceRating",
      "activeContracts", "totalContractValue", "notes"
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) supplier[key] = req.body[key];
    }
    supplier.updatedBy = req.user.id;
    await supplier.save();

    res.json({ success: true, supplier });
  } catch (err) {
    console.error("Supplier update error:", err.message);
    res.status(500).json({ success: false, error: "Failed to update supplier." });
  }
});

// ── DELETE /api/suppliers/:id ─────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: "Supplier not found." });
    res.json({ success: true });
  } catch (err) {
    console.error("Supplier delete error:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete supplier." });
  }
});

// ── GET /api/suppliers/summary/scoreboard ────────────────────────
// Aggregate scorecard summary for dashboard
router.get("/summary/scoreboard", authenticateToken, async (req, res) => {
  try {
    const [stats] = await Supplier.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgScore: { $avg: "$overallScore" },
                active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                probation: { $sum: { $cond: [{ $eq: ["$status", "probation"] }, 1, 0] } }
              }
            }
          ],
          topSuppliers: [
            { $match: { overallScore: { $ne: null } } },
            { $sort: { overallScore: -1 } },
            { $limit: 5 },
            { $project: { name: 1, overallScore: 1, tier: 1, status: 1 } }
          ],
          byTier: [{ $group: { _id: "$tier", count: { $sum: 1 } } }]
        }
      }
    ]);

    res.json({
      success: true,
      totals: stats.totals[0] || { total: 0, avgScore: 0, active: 0, probation: 0 },
      topSuppliers: stats.topSuppliers || [],
      byTier: stats.byTier || []
    });
  } catch (err) {
    console.error("Supplier scoreboard error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch supplier scoreboard." });
  }
});

export default router;
