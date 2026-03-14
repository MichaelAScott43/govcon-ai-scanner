import express from "express";
import multer from "multer";
import { searchOpportunities, normalizeOpportunity } from "../services/samGov.js";
import { calculateBidScore, detectClauses } from "../services/bidScoring.js";
import { parseDocument } from "../services/documentParser.js";
import { authenticateToken } from "../middleware/auth.js";
import Opportunity from "../models/Opportunity.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// POST /api/opportunities/search — Search SAM.gov by NAICS / keyword
router.post("/search", authenticateToken, async (req, res) => {
  try {
    const { postedFrom, postedTo, keyword, naics, psc, setAside, noticeType, page, limit } = req.body;

    if (!postedFrom || !postedTo) {
      return res.status(400).json({ success: false, error: "postedFrom and postedTo are required." });
    }

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
    console.error("SAM search error:", error.message);
    res.status(error?.code === "MISSING_API_KEY" ? 400 : 500).json({
      success: false,
      errorCode: error?.code || null,
      error: error?.message || "Failed to fetch opportunities."
    });
  }
});

// GET /api/opportunities — Get user's saved opportunities
router.get("/", authenticateToken, async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ savedBy: req.user.id })
      .sort({ postedDate: -1 })
      .limit(100);

    res.json({ success: true, opportunities });
  } catch (error) {
    console.error("Get opportunities error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch saved opportunities." });
  }
});

// POST /api/opportunities/analyze — Analyze an uploaded document
router.post("/analyze", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      text = await parseDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (req.body.text) {
      text = req.body.text;
    } else {
      return res.status(400).json({ success: false, error: "Provide a file or text for analysis." });
    }

    const clauses = detectClauses(text);
    const scoreData = calculateBidScore(text);

    res.json({
      success: true,
      fileName: req.file?.originalname || "pasted-text",
      extractedTextPreview: text.slice(0, 3000),
      clausesDetected: clauses,
      ...scoreData,
      disclaimer: "Designed for Non-Classified Use Only"
    });
  } catch (error) {
    console.error("Document analysis error:", error.message);
    res.status(500).json({ success: false, error: "Failed to analyze document." });
  }
});

// POST /api/opportunities/save — Save an opportunity to the user's list
router.post("/save", authenticateToken, async (req, res) => {
  try {
    const { opportunity } = req.body;
    if (!opportunity?.noticeId) {
      return res.status(400).json({ success: false, error: "Valid opportunity data is required." });
    }

    const saved = await Opportunity.findOneAndUpdate(
      { noticeId: opportunity.noticeId },
      {
        $set: { ...opportunity, cachedAt: new Date() },
        $addToSet: { savedBy: req.user.id }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, opportunity: saved });
  } catch (error) {
    console.error("Save opportunity error:", error.message);
    res.status(500).json({ success: false, error: "Failed to save opportunity." });
  }
});

// GET /api/opportunities/debug — Validate SAM API connectivity
router.get("/debug", authenticateToken, async (req, res) => {
  if (!process.env.SAM_API_KEY) {
    return res.status(400).json({
      success: false,
      errorCode: "MISSING_API_KEY",
      error: "SAM_API_KEY is not configured. Add it to your .env file and restart."
    });
  }

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const fmt = (d) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

  try {
    const data = await searchOpportunities({ postedFrom: fmt(weekAgo), postedTo: fmt(today), limit: 1 });
    res.json({ success: true, message: "SAM API connectivity confirmed.", totalRecords: data.totalRecords ?? null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || "SAM connectivity check failed." });
  }
});

export default router;
