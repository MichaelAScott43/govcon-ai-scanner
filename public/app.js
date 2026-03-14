const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

const uploadForm = document.getElementById("uploadForm");
const pasteForm = document.getElementById("pasteForm");
const samSearchForm = document.getElementById("samSearchForm");

const samResultsEl = document.getElementById("samResults");
const samStatusEl = document.getElementById("samStatus");

const bidScoreEl = document.getElementById("bidScore");
const recommendationEl = document.getElementById("recommendation");
const estimatedHoursEl = document.getElementById("estimatedHours");
const estimatedCostEl = document.getElementById("estimatedCost");
const complexityEl = document.getElementById("complexity");

const snapshotGridEl = document.getElementById("snapshotGrid");
const positiveSignalsEl = document.getElementById("positiveSignals");
const negativeSignalsEl = document.getElementById("negativeSignals");
const clausesListEl = document.getElementById("clausesList");
const complianceListEl = document.getElementById("complianceList");
const risksListEl = document.getElementById("risksList");
const estimatorBoxEl = document.getElementById("estimatorBox");
const executiveSummaryEl = document.getElementById("executiveSummary");
const nextStepsListEl = document.getElementById("nextStepsList");
const previewTextEl = document.getElementById("previewText");

const downloadReportBtn = document.getElementById("downloadReportBtn");
const printReportBtn = document.getElementById("printReportBtn");

let latestAnalysis = null;

function toIsoDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parts = value.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return value;
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabPanels.forEach((panel) => panel.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(targetId).classList.add("active");
  });
});

function switchToTab(tabId) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function safeText(value) {
  return value === null || value === undefined || value === "" ? "Not detected" : value;
}

function clearList(el, fallbackText) {
  el.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = fallbackText;
  el.appendChild(li);
}

function renderList(el, items, fallbackText) {
  el.innerHTML = "";

  if (!items || !items.length) {
    clearList(el, fallbackText);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderSnapshot(snapshot = {}) {
  const fields = [
    ["Agency", snapshot.agency],
    ["Solicitation #", snapshot.solicitationNumber],
    ["NAICS", snapshot.naics],
    ["PSC", snapshot.psc],
    ["Set-Aside", snapshot.setAside],
    ["Contract Type", snapshot.contractType],
    ["Due Date", snapshot.dueDate],
    ["Place of Performance", snapshot.placeOfPerformance],
    ["Period of Performance", snapshot.periodOfPerformance]
  ];

  snapshotGridEl.innerHTML = "";

  fields.forEach(([label, value]) => {
    const box = document.createElement("div");
    box.className = "snapshot-item";
    box.innerHTML = `
      <span class="snapshot-label">${label}</span>
      <span class="snapshot-value">${safeText(value)}</span>
    `;
    snapshotGridEl.appendChild(box);
  });
}

function renderEstimator(estimator = {}) {
  estimatorBoxEl.innerHTML = "";

  const rows = [
    ["Effort Level", estimator.effortLevel],
    ["Estimated Hours", estimator.estimatedHours],
    ["Estimated Proposal Cost", estimator.estimatedProposalCost],
    ["Team Need", estimator.teamNeed],
    ["Complexity", estimator.complexity]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "estimator-row";
    row.innerHTML = `
      <strong>${label}</strong>
      <span>${safeText(value)}</span>
    `;
    estimatorBoxEl.appendChild(row);
  });
}

function buildNextSteps(data) {
  const steps = [];

  if (data.recommendation === "Strong Bid") {
    steps.push("Advance to capture and proposal planning review.");
  } else if (data.recommendation === "Bid with Review") {
    steps.push("Conduct management review before committing bid resources.");
  } else if (data.recommendation === "Borderline") {
    steps.push("Validate strategic fit, staffing, and pricing burden before proceeding.");
  } else {
    steps.push("Consider declining unless strategic justification exists.");
  }

  if (data.risks?.length) {
    steps.push("Review top risk indicators and assign owners for each major concern.");
  }

  if (data.complianceFlags?.length) {
    steps.push("Confirm compliance requirements with contracts and security leadership.");
  }

  if (data.opportunitySnapshot?.dueDate) {
    steps.push(`Validate submission timeline against detected due date: ${data.opportunitySnapshot.dueDate}.`);
  } else {
    steps.push("Confirm due date directly from solicitation documents before bid decision.");
  }

  return steps;
}

function renderRecommendationPill(recommendation) {
  recommendationEl.textContent = recommendation || "Pending";
  recommendationEl.style.background = "#eef4fb";
  recommendationEl.style.color = "#14243a";

  if (recommendation === "Strong Bid") {
    recommendationEl.style.background = "#e6f4ea";
    recommendationEl.style.color = "#276749";
  } else if (recommendation === "Bid with Review") {
    recommendationEl.style.background = "#fff7df";
    recommendationEl.style.color = "#8a6a13";
  } else if (recommendation === "Borderline") {
    recommendationEl.style.background = "#fff4e5";
    recommendationEl.style.color = "#9a5b00";
  } else if (recommendation === "No-Bid") {
    recommendationEl.style.background = "#fdecec";
    recommendationEl.style.color = "#a63c3c";
  }
}

function renderAnalysis(data) {
  latestAnalysis = data;

  bidScoreEl.textContent = data.bidScore ?? "--";
  renderRecommendationPill(data.recommendation);
  estimatedHoursEl.textContent = safeText(data.estimator?.estimatedHours);
  estimatedCostEl.textContent = safeText(data.estimator?.estimatedProposalCost);
  complexityEl.textContent = safeText(data.estimator?.complexity);

  renderSnapshot(data.opportunitySnapshot || {});
  renderList(positiveSignalsEl, data.positiveSignals, "No positive signals detected.");
  renderList(negativeSignalsEl, data.negativeSignals, "No negative signals detected.");
  renderList(clausesListEl, data.clausesDetected, "No major clauses detected.");
  renderList(complianceListEl, data.complianceFlags, "No compliance flags detected.");
  renderList(risksListEl, data.risks, "No major risks detected.");
  renderEstimator(data.estimator || {});

  executiveSummaryEl.textContent = data.executiveSummary || "No summary available.";
  previewTextEl.textContent = data.extractedTextPreview || "No preview available.";

  const nextSteps = buildNextSteps(data);
  renderList(nextStepsListEl, nextSteps, "No next steps available.");

  switchToTab("resultsTab");
}

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please choose a file to analyze.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("reviewType", document.getElementById("reviewType").value);

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload analysis failed.");
    }

    renderAnalysis(data);
  } catch (error) {
    console.error(error);
    alert(error.message || "Something went wrong while analyzing the file.");
  }
});

pasteForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = document.getElementById("pastedText").value.trim();

  if (!text) {
    alert("Please paste text to analyze.");
    return;
  }

  const mockAnalysis = {
    bidScore: 62,
    recommendation: "Bid with Review",
    estimator: {
      effortLevel: "Moderate",
      estimatedHours: "10-18 hours",
      estimatedProposalCost: "$3,000-$6,000",
      teamNeed: "Contracts, PM, Reviewer",
      complexity: "Moderate"
    },
    opportunitySnapshot: {
      agency: "Text-based quick review",
      solicitationNumber: "Not detected",
      naics: "Not detected",
      psc: "Not detected",
      setAside: text.toLowerCase().includes("sdvosb") ? "SDVOSB" : "Not detected",
      contractType: text.toLowerCase().includes("firm-fixed-price") ? "Firm-Fixed-Price" : "Not detected",
      dueDate: "Not detected",
      placeOfPerformance: "Not detected",
      periodOfPerformance: "Not detected"
    },
    clausesDetected: text.includes("252.204-7012") ? ["DFARS 252.204-7012"] : [],
    complianceFlags: [
      "Manual pasted-text review performed"
    ],
    risks: [
      "Quick text review may omit document structure context"
    ],
    positiveSignals: [
      "Pasted text submitted for preliminary review"
    ],
    negativeSignals: [
      "No original document metadata available"
    ],
    executiveSummary:
      "This is a quick pasted-text review intended for fast screening. For a more reliable analysis, upload the source document so the platform can evaluate structure, clauses, and opportunity details more completely.",
    extractedTextPreview: text
  };

  renderAnalysis(mockAnalysis);
});

// Pre-populate SAM search dates: default to last 30 days
(function setDefaultSamDates() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const toHtmlDateValue = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const postedFromEl = document.getElementById("postedFrom");
  const postedToEl = document.getElementById("postedTo");

  if (postedFromEl && !postedFromEl.value) postedFromEl.value = toHtmlDateValue(thirtyDaysAgo);
  if (postedToEl && !postedToEl.value) postedToEl.value = toHtmlDateValue(today);
})();

samSearchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const setAsideEl = document.getElementById("setAside");

  const params = new URLSearchParams({
    postedFrom: toIsoDate(document.getElementById("postedFrom").value),
    postedTo: toIsoDate(document.getElementById("postedTo").value),
    keyword: document.getElementById("keyword").value.trim(),
    naics: document.getElementById("naics").value.trim(),
    psc: document.getElementById("psc").value.trim(),
    setAside: setAsideEl ? setAsideEl.value.trim() : "",
    noticeType: (document.getElementById("noticeType")?.value || "").trim()
  });

  if (!params.get("postedFrom") || !params.get("postedTo")) {
    alert("Posted From and Posted To are required for SAM search.");
    return;
  }

  samStatusEl.textContent = "Searching SAM.gov...";
  samResultsEl.innerHTML = `<p class="empty-state">Searching...</p>`;

  try {
    const response = await fetch(`/api/opportunities?${params.toString()}`);
    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    if (!contentType.includes("application/json")) {
      throw new Error(`Server returned non-JSON response: ${rawText.slice(0, 120)}`);
    }

    const data = JSON.parse(rawText);

    if (!response.ok || !data.success) {
      const isMissingKey = data.errorCode === "MISSING_API_KEY";
      throw new Error(
        isMissingKey
          ? "SAM API key is not configured. Add your SAM_API_KEY to the .env file on the server and restart."
          : data.error || "SAM search failed."
      );
    }

    const opportunities = data.opportunities || [];
    samStatusEl.textContent = `${opportunities.length} result(s) loaded.`;

    if (!opportunities.length) {
      samResultsEl.innerHTML = `<p class="empty-state">No results found for this search.</p>`;
      return;
    }

    samResultsEl.innerHTML = "";

    opportunities.forEach((opp) => {
      const item = document.createElement("div");
      item.className = "sam-item";

      item.innerHTML = `
        <div class="sam-item-top">
          <div>
            <h4>${safeText(opp.title)}</h4>
            <div class="muted">${safeText(opp.departmentIndAgency || opp.fullParentPathName || opp.office)}</div>
          </div>
        </div>

        <div class="sam-meta">
          <span>Solicitation: ${safeText(opp.solicitationNumber)}</span>
          <span>NAICS: ${safeText(opp.naicsCode)}</span>
          <span>PSC: ${safeText(opp.pscCode)}</span>
          <span>Set-Aside: ${safeText(opp.setAside)}</span>
          <span>Posted: ${safeText(opp.postedDate)}</span>
          <span>Due: ${safeText(opp.responseDeadLine)}</span>
        </div>

        <div class="sam-actions">
          <button class="secondary-btn quick-analyze-btn">Quick Analyze</button>
          ${opp.uiLink ? `<a class="sam-link" href="${opp.uiLink}" target="_blank" rel="noopener noreferrer">View on SAM</a>` : ""}
        </div>
      `;

      const quickAnalyzeBtn = item.querySelector(".quick-analyze-btn");
      quickAnalyzeBtn.addEventListener("click", () => {
        const quickData = {
          bidScore: 58,
          recommendation: "Bid with Review",
          estimator: {
            effortLevel: "Moderate",
            estimatedHours: "12-22 hours",
            estimatedProposalCost: "$4,000-$7,000",
            teamNeed: "Contracts, PM, Pricing",
            complexity: "Moderate"
          },
          opportunitySnapshot: {
            agency: opp.departmentIndAgency || opp.fullParentPathName || opp.office || "Not detected",
            solicitationNumber: opp.solicitationNumber,
            naics: opp.naicsCode,
            psc: opp.pscCode,
            setAside: opp.setAside,
            contractType: opp.contractType,
            dueDate: opp.responseDeadLine,
            placeOfPerformance: typeof opp.placeOfPerformance === "string"
              ? opp.placeOfPerformance
              : JSON.stringify(opp.placeOfPerformance || "Not detected"),
            periodOfPerformance: "Review source documents"
          },
          clausesDetected: [],
          complianceFlags: [
            "Preliminary SAM metadata review only"
          ],
          risks: [
            "Detailed clauses and compliance not evaluated from metadata alone"
          ],
          positiveSignals: [
            "Opportunity identified through SAM.gov workflow"
          ],
          negativeSignals: [
            "Full solicitation document not uploaded yet"
          ],
          executiveSummary:
            "This preliminary assessment is based on SAM.gov opportunity metadata only. Upload the source solicitation for deeper clause detection, compliance analysis, and a more reliable bid/no-bid recommendation.",
          extractedTextPreview:
            `Title: ${safeText(opp.title)}\nAgency: ${safeText(opp.departmentIndAgency || opp.fullParentPathName || opp.office)}\nSolicitation: ${safeText(opp.solicitationNumber)}\nNAICS: ${safeText(opp.naicsCode)}\nPSC: ${safeText(opp.pscCode)}\nSet-Aside: ${safeText(opp.setAside)}\nPosted: ${safeText(opp.postedDate)}\nDue: ${safeText(opp.responseDeadLine)}`
        };

        renderAnalysis(quickData);
      });

      samResultsEl.appendChild(item);
    });
  } catch (error) {
    console.error(error);
    samStatusEl.textContent = "Search failed.";
    samResultsEl.innerHTML = `<p class="empty-state">${error.message || "Unable to search SAM.gov."}</p>`;
  }
});

function buildReportText(data) {
  const snapshot = data.opportunitySnapshot || {};
  const estimator = data.estimator || {};

  return `
GovCon AI Proposal Scanner Report
=================================

Bid Score: ${safeText(data.bidScore)}
Recommendation: ${safeText(data.recommendation)}

Opportunity Snapshot
--------------------
Agency: ${safeText(snapshot.agency)}
Solicitation Number: ${safeText(snapshot.solicitationNumber)}
NAICS: ${safeText(snapshot.naics)}
PSC: ${safeText(snapshot.psc)}
Set-Aside: ${safeText(snapshot.setAside)}
Contract Type: ${safeText(snapshot.contractType)}
Due Date: ${safeText(snapshot.dueDate)}
Place of Performance: ${safeText(snapshot.placeOfPerformance)}
Period of Performance: ${safeText(snapshot.periodOfPerformance)}

Proposal Estimator
------------------
Effort Level: ${safeText(estimator.effortLevel)}
Estimated Hours: ${safeText(estimator.estimatedHours)}
Estimated Proposal Cost: ${safeText(estimator.estimatedProposalCost)}
Team Need: ${safeText(estimator.teamNeed)}
Complexity: ${safeText(estimator.complexity)}

Positive Signals
----------------
${(data.positiveSignals || []).join("\n") || "None detected"}

Negative Signals
----------------
${(data.negativeSignals || []).join("\n") || "None detected"}

Detected Clauses
----------------
${(data.clausesDetected || []).join("\n") || "None detected"}

Compliance Flags
----------------
${(data.complianceFlags || []).join("\n") || "None detected"}

Risk Indicators
---------------
${(data.risks || []).join("\n") || "None detected"}

Executive Summary
-----------------
${safeText(data.executiveSummary)}

Preview
-------
${safeText(data.extractedTextPreview)}

Designed for Non-Classified Use Only
GovCon AI provides preliminary analysis and does not replace professional contract review.
`.trim();
}

downloadReportBtn.addEventListener("click", () => {
  if (!latestAnalysis) {
    alert("No analysis is available to download yet.");
    return;
  }

  const reportText = buildReportText(latestAnalysis);
  const blob = new Blob([reportText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "govcon-ai-report.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
});

printReportBtn.addEventListener("click", () => {
  window.print();
});

// ---------------------------------------------------------------------------
// 30-Day Free Trial & Upgrade CTA
// ---------------------------------------------------------------------------
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/aFa7sK8peh2l4Up8aVf7i02";
const TRIAL_DAYS = 30;
const TRIAL_WARNING_DAYS = 5; // show upgrade button when this many days remain

function getTrialStart() {
  let start = localStorage.getItem("govcon_trial_start");
  if (!start) {
    // Store only the calendar date (YYYY-MM-DD) so day counting is date-based,
    // not affected by the time of day the user first visited.
    start = new Date().toISOString().slice(0, 10);
    localStorage.setItem("govcon_trial_start", start);
  }
  return start; // "YYYY-MM-DD" string
}

function getTrialDaysRemaining() {
  const startStr = getTrialStart();
  const startDate = new Date(startStr + "T00:00:00");
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const elapsed = Math.round((today - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

function initTrialBanner() {
  const daysLeft = getTrialDaysRemaining();
  const trialBanner = document.getElementById("trialBanner");
  const trialMessage = document.getElementById("trialMessage");
  const upgradeNowBtn = document.getElementById("upgradeNowBtn");
  const trialExpiredOverlay = document.getElementById("trialExpiredOverlay");

  if (!trialBanner) return;

  if (daysLeft === 0) {
    // Trial expired — show the blocking overlay
    trialMessage.textContent = "⚠️ Your free trial has expired.";
    upgradeNowBtn.style.display = "inline-block";
    if (trialExpiredOverlay) trialExpiredOverlay.style.display = "flex";
  } else if (daysLeft <= TRIAL_WARNING_DAYS) {
    // Approaching expiry — show countdown + upgrade button
    trialMessage.textContent = `⏳ ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`;
    upgradeNowBtn.style.display = "inline-block";
  } else {
    // Plenty of time left — friendly message only
    trialMessage.textContent = `🎉 Free trial active — ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining.`;
    upgradeNowBtn.style.display = "none";
  }
}

// Run on page load
initTrialBanner();
