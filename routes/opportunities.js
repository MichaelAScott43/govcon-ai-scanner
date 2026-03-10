import express from "express";
import { searchOpportunities, normalizeOpportunity } from "../services/samService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  console.log("HIT /api/opportunities", req.query);

  try {
    const {
      postedFrom,
      postedTo,
      keyword,
      naics,
      psc,
      setAside,
      noticeType,
      page,
      limit
    } = req.query;

    const data = await searchOpportunities({
      postedFrom,
      postedTo,
      keyword,
      naics,
      psc,
      setAside,
      noticeType,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 100
    });

    const opportunities = Array.isArray(data.opportunitiesData)
      ? data.opportunitiesData.map(normalizeOpportunity)
      : [];

    res.json({
      success: true,
      totalRecords: data.totalRecords ?? opportunities.length,
      page: page ? Number(page) : 1,
      opportunities
    });
  } catch (error) {
    console.error("SAM API Error:", error?.message, error);

    res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch opportunities"
    });
  }
});

export default router;