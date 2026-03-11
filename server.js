import "./tracer.js"; // must be the first import — initializes Datadog APM
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { tracer } from "./tracer.js";
import opportunitiesRouter from "./routes/opportunities.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// API routes — registered early so they are matched before the wildcard fallback
app.use("/api/opportunities", opportunitiesRouter);

// Multer upload config
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Health route
app.get("/health", (req, res) => {
  res.json({ ok: true, app: "GovCon AI Scanner" });
});

// Helper: normalize text
function normalizeText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

// Helper: simple scoring model
function calculateBidScore(text) {
  const lower = text.toLowerCase();

  const scorecard = {
    positive: 0,
    negative: 0,
    flags: [],
    summary: []
  };

  const positiveSignals = [
    {
      label: "Set-aside language detected",
      points: 15,
      tests: ["small business", "sdvosb", "hubzone", "wosb", "8(a)", "set-aside"]
    },
    {
      label: "Incumbent or past performance language detected",
      points: 10,
      tests: ["past performance", "relevant experience", "cpars", "incumbent"]
    },
    {
      label: "Pricing structure identified",
      points: 10,
      tests: ["firm-fixed-price", "ffp", "time-and-materials", "t&m", "cost-plus"]
    },
    {
      label: "Statement of work / PWS found",
      points: 10,
      tests: ["statement of work", "performance work statement", "pws", "scope of work"]
    },
    {
      label: "Evaluation criteria found",
      points: 15,
      tests: ["evaluation criteria", "best value", "tradeoff", "technically acceptable", "lpta"]
    },
    {
      label: "Submission instructions found",
      points: 10,
      tests: ["instructions to offerors", "submission", "proposal due", "closing date"]
    }
  ];

  const negativeSignals = [
    {
      label: "Security / clearance requirement detected",
      points: 20,
      tests: ["secret clearance", "top secret", "classified", "sci", "facility clearance"]
    },
    {
      label: "Complex compliance burden detected",
      points: 10,
      tests: ["cmmc", "nist 800-171", "dcma", "dibr", "cybersecurity maturity"]
    },
    {
      label: "Heavy staffing requirement detected",
      points: 10,
      tests: ["key personnel", "minimum staffing", "resume requirements", "staffing plan"]
    },
    {
      label: "Aggressive turnaround detected",
      points: 15,
      tests: ["within 24 hours", "within 48 hours", "urgent", "expedited", "immediate response"]
    },
    {
      label: "Bonding / insurance burden detected",
      points: 10,
      tests: ["bonding", "performance bond", "liability insurance", "certificate of insurance"]
    }
  ];

  for (const signal of positiveSignals) {
    if (signal.tests.some((term) => lower.includes(term))) {
      scorecard.positive += signal.points;
      scorecard.flags.push(`+ ${signal.label}`);
    }
  }

  for (const signal of negativeSignals) {
    if (signal.tests.some((term) => lower.includes(term))) {
      scorecard.negative += signal.points;
      scorecard.flags.push(`- ${signal.label}`);
    }
  }

  let score = 50 + scorecard.positive - scorecard.negative;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  let recommendation = "No-Bid";
  if (score >= 75) {
    recommendation = "Strong Bid";
  } else if (score >= 60) {
    recommendation = "Bid with Review";
  } else if (score >= 40) {
    recommendation = "Borderline";
  }

  const estimatedHours =
    score >= 75 ? "6-12 hours"
    : score >= 60 ? "12-20 hours"
    : score >= 40 ? "20-35 hours"
    : "35+ hours";

  const estimatedProposalCost =
    score >= 75 ? "$1,500-$4,000"
    : score >= 60 ? "$4,000-$8,000"
    : score >= 40 ? "$8,000-$15,000"
    : "$15,000+";

  if (score >= 75) {
    scorecard.summary.push("Opportunity appears structurally favorable.");
  } else if (score >= 60) {
    scorecard.summary.push("Opportunity may be viable, but merits leadership review.");
  } else if (score >= 40) {
    scorecard.summary.push("Opportunity has meaningful friction and should be screened carefully.");
  } else {
    scorecard.summary.push("Opportunity appears expensive or strategically weak.");
  }

  return {
    bidScore: score,
    recommendation,
    estimatedHours,
    estimatedProposalCost,
    flags: scorecard.flags,
    summary: scorecard.summary
  };
}

// Helper: FAR / DFARS keyword detector
function detectClauses(text) {
  const lower = text.toLowerCase();

  const clauses = [
    { name: "FAR 52.212-1", terms: ["52.212-1", "instructions to offerors"] },
    { name: "FAR 52.212-2", terms: ["52.212-2", "evaluation"] },
    { name: "FAR 52.219-6", terms: ["52.219-6", "small business"] },
    { name: "FAR 52.233-1", terms: ["52.233-1", "disputes"] },
    { name: "DFARS 252.204-7012", terms: ["252.204-7012", "covered defense information"] },
    { name: "DFARS 252.204-7020", terms: ["252.204-7020", "nist sp 800-171 dod assessment"] },
    { name: "DFARS 252.215-7008", terms: ["252.215-7008"] }
  ];

  return clauses
    .filter((clause) => clause.terms.some((term) => lower.includes(term)))
    .map((clause) => clause.name);
}

// Main upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  const span = tracer?.startSpan("govcon.document.upload");
  try {
    if (!req.file) {
      span?.setTag("error", true);
      span?.setTag("govcon.upload.error", "no_file");
      return res.status(400).json({
        success: false,
        error: "No file uploaded."
      });
    }

    span?.setTag("govcon.file.name", req.file.originalname);
    span?.setTag("govcon.file.size", req.file.size);
    span?.setTag("govcon.file.mimetype", req.file.mimetype);

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const extractedText = pdfData.text || "";

    const clauses = detectClauses(extractedText);
    const scoreData = calculateBidScore(extractedText);

    span?.setTag("govcon.bid.score", scoreData.bidScore);
    span?.setTag("govcon.bid.recommendation", scoreData.recommendation);
    span?.setTag("govcon.clauses.count", clauses.length);
    span?.setTag("govcon.file.pages", pdfData.numpages || 0);

    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      fileName: req.file.originalname,
      pageCount: pdfData.numpages || 0,
      extractedTextPreview: extractedText.slice(0, 2500),
      clausesDetected: clauses,
      ...scoreData,
      disclaimer: "Designed for Non-Classified Use Only"
    });
  } catch (error) {
    span?.setTag("error", true);
    span?.setTag("govcon.upload.error", error?.message);
    console.error("Upload analysis error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to analyze uploaded document."
    });
  } finally {
    span?.finish();
  }
});

// Real pasted-text route
app.post("/analyze-text", async (req, res) => {
  const span = tracer?.startSpan("govcon.text.analyze");
  try {
    const { text, reviewType } = req.body;

    if (!text || !text.trim()) {
      span?.setTag("error", true);
      span?.setTag("govcon.analyze.error", "no_text");
      return res.status(400).json({
        success: false,
        error: "No text provided for analysis."
      });
    }

    span?.setTag("govcon.review.type", reviewType || "text-analysis");
    span?.setTag("govcon.text.length", text.length);

    const normalizedText = normalizeText(text);
    const clauses = detectClauses(normalizedText);
    const scoreData = calculateBidScore(normalizedText);

    span?.setTag("govcon.bid.score", scoreData.bidScore);
    span?.setTag("govcon.bid.recommendation", scoreData.recommendation);
    span?.setTag("govcon.clauses.count", clauses.length);

    return res.json({
      success: true,
      reviewType: reviewType || "text-analysis",
      extractedTextPreview: normalizedText.slice(0, 3000),
      clausesDetected: clauses,
      ...scoreData,
      disclaimer: "Designed for Non-Classified Use Only"
    });
  } catch (error) {
    span?.setTag("error", true);
    span?.setTag("govcon.analyze.error", error?.message);
    console.error("Text analysis error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to analyze pasted text."
    });
  } finally {
    span?.finish();
  }
});

// Fallback — serve the SPA for all unmatched routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`GovCon AI Scanner running on port ${PORT}`);

  if (process.env.SAM_API_KEY) {
    console.log("✅ SAM_API_KEY is configured.");
  } else {
    console.warn(
      "⚠️  WARNING: SAM_API_KEY is not set. SAM.gov search will fail until this is configured.\n" +
      "   • Local development: add SAM_API_KEY=<your_key> to your .env file and restart.\n" +
      "   • Render deployment: set SAM_API_KEY in the Render dashboard under Environment > Environment Variables."
    );
  }
});