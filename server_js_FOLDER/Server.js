import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(express.static(".")); // serves index.html and assets
app.use("/api/opportunities", opportunitiesRouter);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
    }
    cb(null, true);
  }
});

// --- GOVCON PROPOSAL INTELLIGENCE PROMPT ---
const BASE_SYSTEM_PROMPT = `
You are an expert Government Contracting Proposal Intelligence Analyst specializing in FAR, DFARS, proposal compliance, solicitation review, and subcontract risk for U.S. defense contractors.

Your task is to analyze user-provided RFP, RFQ, SOW, PWS, subcontract, supplier, or procurement text and produce a structured review that helps proposal teams understand what they are getting into before they bid.

Focus especially on:
- bid requirements
- evaluation factors
- FAR / DFARS indicators
- flowdown obligations
- execution and pricing risk
- questions that should be resolved before bid submission

Do NOT invent clauses or requirements not visible in the text.
If information is incomplete, say so clearly.

OUTPUT FORMAT (use these exact sections):

---

OPPORTUNITY SNAPSHOT
Summarize what the opportunity appears to be, who is likely buying, and what the contractor would likely be expected to deliver.

---

BID REQUIREMENTS & SUBMISSION DRIVERS
Identify visible proposal or response requirements, submission expectations, deliverables, schedule indicators, reporting obligations, or compliance representations.

---

EVALUATION FACTORS & WIN THEMES
Identify visible or likely evaluation factors. If formal evaluation criteria are not visible, make cautious practical inferences and label them accordingly.

---

CLAUSE / FLOWDOWN WATCHLIST
Identify visible FAR / DFARS / flowdown / ITAR / EAR / cybersecurity / quality / small business / Ts&Cs indicators. If not evident, say "Not evident from provided text."

---

BID & EXECUTION RISK FLAGS
For each risk include:
- Risk Level (High / Medium / Low)
- What the issue is
- Why it matters
- Recommended action

---

QUESTIONS TO RESOLVE BEFORE BID
Provide the key questions the proposal or contracts team should answer before proceeding.

---

RECOMMENDED NEXT ACTIONS
Provide a short, prioritized action list.

---

CONFIDENCE & LIMITATIONS
State that the review is based only on the provided text and is an AI-assisted review, not legal advice.

---

STYLE GUIDELINES:
- Write like a senior GovCon proposal strategist.
- Be practical, direct, and operational.
- Prioritize what matters before bid submission.
`;

function buildSystemPrompt(reviewType, contractType) {
  const focusMap = {
    proposal: "Emphasize proposal-readiness, submission requirements, evaluation factors, and pre-bid clarity.",
    biddecision: "Emphasize pursuit attractiveness, hidden burden, execution risk, margin risk, and whether this looks dangerous to pursue.",
    compliance: "Emphasize FAR / DFARS indicators, visible representations, certifications, and compliance burden that may affect the bid.",
    flowdown: "Emphasize subcontract flowdowns, clauses, Ts&Cs incorporation, and obligations passed to lower tiers.",
    price: "Emphasize pricing ambiguity, cost drivers, assumptions, and anything that could hurt profitability or price realism.",
    export: "Emphasize ITAR / EAR indicators, controlled technical data, and export control handling obligations.",
    general: "Provide a balanced proposal intelligence review covering requirements, clauses, and bid risks."
  };

  const focus = focusMap[reviewType] || focusMap.proposal;

  const contractNote = contractType
    ? `\n\nContext from user: The contract type may be ${contractType}. Consider how that affects pricing, execution, and compliance risk.`
    : "";

  return `${BASE_SYSTEM_PROMPT}\n\nFOCUS FOR THIS REVIEW: ${focus}${contractNote}`;
}

async function runAnalysis(text, reviewType, contractType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Server missing OPENAI_API_KEY env var.");
  }

  const systemPrompt = buildSystemPrompt(reviewType, contractType);

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.15,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please analyze the following government contracting text:\n\n${text}` }
      ]
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI error: ${errText}`);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "No response content.";
}

async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const fileBuffer = await fs.readFile(filePath);
    const parsed = await pdfParse(fileBuffer);
    return parsed.text || "";
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  if (ext === ".txt") {
    return await fs.readFile(filePath, "utf8");
  }

  throw new Error("Unsupported file type.");
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { text, reviewType = "proposal", contractType } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing 'text'." });
    }

    const result = await runAnalysis(text, reviewType, contractType);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Unknown server error" });
  }
});

app.post("/api/analyze-upload", upload.single("document"), async (req, res) => {
  let uploadedFilePath = null;

  try {
    const { reviewType = "proposal", contractType } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    uploadedFilePath = req.file.path;

    const extractedText = await extractTextFromFile(uploadedFilePath, req.file.originalname);

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ error: "No readable text was found in the uploaded document." });
    }

    const result = await runAnalysis(extractedText, reviewType, contractType);

    res.json({
      fileName: req.file.originalname,
      extractedCharCount: extractedText.length,
      result
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Unknown server error" });
  } finally {
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
      } catch {
        // ignore cleanup failure
      }
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
