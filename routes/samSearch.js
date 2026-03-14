import express from "express";
import { searchOpportunities, normalizeOpportunity } from "../services/samService.js";
import { tracer } from "../tracer.js";

const router = express.Router();

/**
 * GET /api/sam-search?keyword=VALUE
 *
 * Searches SAM.gov for opportunities matching the given keyword.
 * Accepts optional query params: postedFrom, postedTo, naics, psc, setAside, page, limit.
 * Defaults to a 90-day rolling window when postedFrom/postedTo are not supplied.
 */
router.get("/", async (req, res) => {
  console.log("HIT /api/sam-search", req.query);

  if (!process.env.SAM_API_KEY) {
    return res.status(400).json({
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "SAM_API_KEY is not configured on the server. Add it to your .env file and restart."
    });
  }

  const { keyword, naics, psc, setAside, noticeType, page, limit } = req.query;
  let { postedFrom, postedTo } = req.query;

  // Default to the last 90 days when dates are not provided
  if (!postedFrom || !postedTo) {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 90);

    const fmt = (d) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

    postedFrom = postedFrom || fmt(pastDate);
    postedTo = postedTo || fmt(today);
  }

  const span = tracer?.startSpan("govcon.sam.search");

  try {
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
    console.error("SAM Search Error:", error?.message, error);
    span?.setTag("error", true);
    span?.setTag("govcon.sam.error", error?.message);

    res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch opportunities from SAM.gov."
    });
  } finally {
    span?.finish();
  }
});

export default router;
