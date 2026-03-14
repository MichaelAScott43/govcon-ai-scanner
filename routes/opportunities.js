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

// Debug endpoint: validates SAM API connectivity with minimal parameters
router.get("/debug", async (req, res) => {
  console.log("HIT /api/opportunities/debug");

  if (!process.env.SAM_API_KEY) {
    return res.status(400).json({
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "SAM_API_KEY is not configured on the server. Add it to your .env file and restart.",
      hint: "Set SAM_API_KEY in your .env file and restart the server."
    });
  }

  console.log("✅ SAM_API_KEY is present.");

  // Use a narrow date window (last 7 days) with just the required params
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const formatDate = (d) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

  const postedFrom = formatDate(weekAgo);
  const postedTo = formatDate(today);

  console.log("🔍 Debug using date range:", postedFrom, "→", postedTo);

  try {
    const data = await searchOpportunities({
      postedFrom,
      postedTo,
      limit: 1
    });

    res.json({
      success: true,
      message: "SAM API connectivity confirmed.",
      dateRange: { postedFrom, postedTo },
      totalRecords: data.totalRecords ?? null
    });
  } catch (error) {
    console.error("SAM debug Error:", error?.message);
    res.status(error?.statusCode || 500).json({
      success: false,
      errorCode: error?.code || null,
      error: error?.message || "SAM connectivity check failed",
      hint: "Verify SAM_API_KEY is valid and that the SAM.gov API is reachable from this server."
    });
  }
});

export default router;