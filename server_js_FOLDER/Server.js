import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(".")); // serves index.html

// --- COPY/PASTE SYSTEM PROMPT (GovCon) ---
const BASE_SYSTEM_PROMPT = `
You are an expert Government Procurement Compliance Analyst specializing in FAR, DFARS, and CPSR readiness for U.S. defense contractors.

Your task is to analyze the user's provided procurement, subcontract, supplier, or purchasing text and produce a structured compliance review.

Focus especially on risks that would matter during:

- CPSR (Contractor Purchasing System Review)
- DCMA review
- DCAA audit
- Prime contractor flowdown validation

When analyzing, apply practical procurement judgment — not just generic summarization.

OUTPUT FORMAT (use these exact sections):

---

EXECUTIVE SUMMARY
Provide a concise plain-English summary of what this document or text represents in the procurement lifecycle.

---

COMPLIANCE RISK FLAGS
Identify any potential FAR/DFARS, CPSR, or purchasing system risks.

For each risk include:

- Risk Level (High / Medium / Low)
- What the issue is
- Why it matters for CPSR/DCMA
- Recommended corrective action

If no clear risks are found, state that explicitly but still note any watch items.

---

FLOWDOWN & CLAUSE OBSERVATIONS
Evaluate whether the text appears to properly address:

- Required flowdowns
- Terms & conditions coverage
- ITAR/EAR indicators (if relevant)
- Small business considerations (if visible)

If information is missing, clearly state "Not evident from provided text."

---

PURCHASING SYSTEM RED FLAGS
Look for issues such as:

- inadequate competition
- missing price analysis
- unclear supplier justification
- documentation gaps
- sole source risk indicators
- unusual terms

Be practical and realistic based on limited text.

---

RECOMMENDED NEXT ACTIONS
Provide a short, prioritized checklist the procurement or subcontracts team should consider.

Keep actions operational and audit-focused.

---

CONFIDENCE & LIMITATIONS
Briefly state that the review is based only on the provided text and not a full file review.

---

STYLE GUIDELINES:

- Write like a senior CPSR consultant.
- Be precise and professional.
- Do NOT invent clauses that are not visible.
- If information is missing, say so clearly.
- Prioritize real-world audit risk over theory.
`;

function buildSystemPrompt(reviewType, contractType) {
  const focusMap = {
    general: "General CPSR risk scan with balanced coverage.",
    flowdown: "Emphasize flowdowns, clauses, Ts&Cs, and subcontract language completeness.",
    price: "Emphasize competition adequacy, price/cost analysis, justification, and documentation sufficiency.",
    export: "Emphasize ITAR/EAR indicators, export control language, marking, and controlled technical data handling."
  };

  const focus = focusMap[reviewType] || focusMap.general;

  const contractNote = contractType
    ? `\n\nContext: The user indicates the contract type may be: ${contractType}. Consider how that affects risk (e.g., T&M vs FFP).`
    : "";

  return `${BASE_SYSTEM_PROMPT}\n\nFocus for this review: ${focus}${contractNote}`;
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { text, reviewType, contractType } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text'." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing OPENAI_API_KEY env var." });
    }

    const systemPrompt = buildSystemPrompt(reviewType, contractType);

    // Use OpenAI Chat Completions API
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: `OpenAI error: ${errText}` });
    }

    const data = await resp.json();
    const result = data?.choices?.[0]?.message?.content ?? "No response content.";
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Unknown server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
