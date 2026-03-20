/**
 * Margin Leakage Analytics Routes  –  /api/margins
 * Identifies cost overruns and margin erosion patterns using contract/workflow data.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import Opportunity from "../models/Opportunity.js";
import Supplier from "../models/Supplier.js";

const router = express.Router();

// ── GET /api/margins/summary ──────────────────────────────────────
// Returns a synthetic margin leakage summary derived from saved opportunity data.
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate bid scores and derive estimated margins
    const opportunities = await Opportunity.find({ savedBy: userId })
      .select("title agency naicsCode bidScore recommendation responseDeadLine")
      .lean();

    const total = opportunities.length;
    if (total === 0) {
      return res.json({
        success: true,
        summary: {
          totalOpportunities: 0,
          estimatedLeakage: 0,
          leakageCategories: [],
          riskOpportunities: []
        }
      });
    }

    // Heuristic leakage model based on bid score thresholds
    const leakageCategories = [
      {
        category: "Low Win Probability",
        description: "Opportunities with bid score < 40 representing wasted proposal investment",
        count: opportunities.filter((o) => (o.bidScore ?? 50) < 40).length,
        estimatedCost: opportunities.filter((o) => (o.bidScore ?? 50) < 40).length * 15000
      },
      {
        category: "Borderline Bids",
        description: "Opportunities 40–60 score requiring extra review resources",
        count: opportunities.filter((o) => {
          const s = o.bidScore ?? 50;
          return s >= 40 && s < 60;
        }).length,
        estimatedCost: opportunities.filter((o) => {
          const s = o.bidScore ?? 50;
          return s >= 40 && s < 60;
        }).length * 8000
      },
      {
        category: "Missed Deadlines Risk",
        description: "Opportunities with response deadline within 7 days",
        count: opportunities.filter((o) => {
          if (!o.responseDeadLine) return false;
          const deadline = new Date(o.responseDeadLine);
          const daysLeft = (deadline - Date.now()) / (1000 * 60 * 60 * 24);
          return daysLeft >= 0 && daysLeft <= 7;
        }).length,
        estimatedCost: 25000
      }
    ];

    const estimatedLeakage = leakageCategories.reduce((sum, c) => sum + c.estimatedCost, 0);

    // High-risk opportunities (low score + near deadline)
    const riskOpportunities = opportunities
      .filter((o) => (o.bidScore ?? 50) < 60)
      .slice(0, 10)
      .map((o) => ({
        title: o.title,
        agency: o.agency,
        bidScore: o.bidScore,
        recommendation: o.recommendation,
        responseDeadLine: o.responseDeadLine
      }));

    res.json({
      success: true,
      summary: {
        totalOpportunities: total,
        estimatedLeakage,
        leakageCategories,
        riskOpportunities
      }
    });
  } catch (err) {
    console.error("Margin leakage error:", err.message);
    res.status(500).json({ success: false, error: "Failed to calculate margin leakage." });
  }
});

// ── GET /api/margins/supplier-risk ───────────────────────────────
// Identifies supplier-driven margin risk based on scorecard data
router.get("/supplier-risk", authenticateToken, async (req, res) => {
  try {
    const atRiskSuppliers = await Supplier.find({
      $or: [{ overallScore: { $lt: 60 } }, { status: { $in: ["probation", "inactive"] } }]
    })
      .select("name cage overallScore status tier kpis activeContracts totalContractValue")
      .sort({ overallScore: 1 })
      .limit(20)
      .lean();

    const totalExposure = atRiskSuppliers.reduce((sum, s) => sum + (s.totalContractValue || 0), 0);

    res.json({
      success: true,
      atRiskSuppliers,
      totalContractExposure: totalExposure,
      count: atRiskSuppliers.length
    });
  } catch (err) {
    console.error("Supplier risk error:", err.message);
    res.status(500).json({ success: false, error: "Failed to assess supplier risk." });
  }
});

// ── GET /api/margins/agency-trends ───────────────────────────────
// Agency-level margin trend analysis
router.get("/agency-trends", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const agencyStats = await Opportunity.aggregate([
      { $match: { savedBy: userId } },
      {
        $group: {
          _id: "$agency",
          totalOpps: { $sum: 1 },
          avgBidScore: { $avg: "$bidScore" },
          strongBids: {
            $sum: { $cond: [{ $gte: ["$bidScore", 75] }, 1, 0] }
          },
          noBids: {
            $sum: { $cond: [{ $lt: ["$bidScore", 40] }, 1, 0] }
          }
        }
      },
      { $sort: { totalOpps: -1 } },
      { $limit: 10 }
    ]);

    res.json({ success: true, agencyStats });
  } catch (err) {
    console.error("Agency trends error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load agency trends." });
  }
});

export default router;
