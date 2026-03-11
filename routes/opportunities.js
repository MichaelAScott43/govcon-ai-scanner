import express from "express";
import { searchOpportunities, normalizeOpportunity } from "../services/samService.js";
import { tracer } from "../tracer.js";

const router = express.Router();

router.get("/", async (req, res) => {
  console.log("HIT /api/opportunities", req.query);
  const span = tracer?.startSpan("govcon.sam.search");

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

    span?.setTag("govcon.sam.keyword", keyword || "");
    span?.setTag("govcon.sam.naics", naics || "");
    span?.setTag("govcon.sam.psc", psc || "");
    span?.setTag("govcon.sam.setAside", setAside || "");
    span?.setTag("govcon.sam.postedFrom", postedFrom || "");
    span?.setTag("govcon.sam.postedTo", postedTo || "");

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

    span?.setTag("govcon.sam.results.count", opportunities.length);
    span?.setTag("govcon.sam.results.total", data.totalRecords ?? opportunities.length);

    res.json({
      success: true,
      totalRecords: data.totalRecords ?? opportunities.length,
      page: page ? Number(page) : 1,
      opportunities
    });
  } catch (error) {
    console.error("SAM API Error:", error?.message, error);
    span?.setTag("error", true);
    span?.setTag("govcon.sam.error", error?.message);

    res.status(error?.code === "MISSING_API_KEY" ? 400 : 500).json({
      success: false,
      errorCode: error?.code || null,
      error: error?.message || "Failed to fetch opportunities"
    });
  } finally {
    span?.finish();
  }
});

export default router;