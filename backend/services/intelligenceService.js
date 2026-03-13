/**
 * intelligenceService.js
 *
 * Collects opportunities from all federal databases that use NAICS codes,
 * analyzes the data, computes a trend score, and generates a plain-text
 * summary. Results are cached in-memory and refreshed on demand.
 *
 * Supported sources
 * -----------------
 * - SAM.gov          (requires SAM_API_KEY)
 * - USASpending.gov  (public API)
 * - SBIR.gov         (public API)
 * - Grants.gov       (public API)
 */

import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

/** @type {{ score: number, summary: string, analysis: object, lastRefreshed: string } | null} */
let _cache = null;

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Map a raw API record to a common opportunity schema.
 *
 * @param {object} raw
 * @param {string} source
 * @returns {object}
 */
function normalize(raw, source) {
  return {
    noticeId:
      raw.notice_id ?? raw.noticeId ?? raw.id ?? raw["Award ID"] ?? null,
    title:
      raw.title ??
      raw.solicitation_title ??
      raw.Description ??
      raw.description ??
      null,
    agency:
      raw.agency ??
      raw.fullParentPathName ??
      raw.departmentIndAgency ??
      raw["Awarding Agency"] ??
      raw.agencyName ??
      null,
    naicsCode:
      raw.naicsCode ?? raw.naics_code ?? raw.naics ?? null,
    setAside:
      raw.typeOfSetAsideDescription ??
      raw.typeOfSetAside ??
      raw.set_aside ??
      null,
    postedDate:
      raw.postedDate ??
      raw.posted_date ??
      raw.openDate ??
      raw["Award Date"] ??
      raw.open_date ??
      null,
    responseDate:
      raw.responseDeadLine ??
      raw.response_date ??
      raw.closeDate ??
      raw["Period of Performance Current End Date"] ??
      raw.close_date ??
      null,
    description: (
      raw.description ??
      raw.Description ??
      raw.program_description ??
      raw.synopsis ??
      ""
    ).slice(0, 500),
    opportunityType:
      raw.noticeType ??
      raw.opportunity_type ??
      raw.program ??
      null,
    source,
    url:
      raw.uiLink ??
      raw.url ??
      raw.solicitation_agency_url ??
      null,
  };
}

// ---------------------------------------------------------------------------
// Source: SAM.gov
// ---------------------------------------------------------------------------

async function fetchSam(naicsCodes, daysBack) {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    console.warn("[intelligence] SAM_API_KEY not set — skipping SAM.gov");
    return [];
  }

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - daysBack);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const results = [];

  // Build the list of fetch tasks (one per NAICS or one broad query)
  const fetchTasks = naicsCodes.length
    ? naicsCodes.slice(0, 10).map((naics) =>
        fetch(
          `https://api.sam.gov/opportunities/v1/search?` +
            new URLSearchParams({
              api_key: apiKey,
              postedFrom: fmt(fromDate),
              postedTo: fmt(today),
              naics,
              limit: "100",
            })
        )
          .then((r) => r.json())
          .then((data) =>
            (data.opportunitiesData || []).map((item) =>
              normalize(
                {
                  ...item,
                  agency:
                    item.fullParentPathName || item.departmentIndAgency,
                  url:
                    item.uiLink ||
                    (item.noticeId
                      ? `https://sam.gov/opp/${item.noticeId}/view`
                      : null),
                },
                "sam.gov"
              )
            )
          )
          .catch((err) => {
            console.error(`[intelligence] SAM.gov NAICS ${naics} error:`, err.message);
            return [];
          })
      )
    : [
        fetch(
          `https://api.sam.gov/opportunities/v1/search?` +
            new URLSearchParams({
              api_key: apiKey,
              postedFrom: fmt(fromDate),
              postedTo: fmt(today),
              limit: "100",
            })
        )
          .then((r) => r.json())
          .then((data) =>
            (data.opportunitiesData || []).map((item) =>
              normalize(
                {
                  ...item,
                  agency:
                    item.fullParentPathName || item.departmentIndAgency,
                  url:
                    item.uiLink ||
                    (item.noticeId
                      ? `https://sam.gov/opp/${item.noticeId}/view`
                      : null),
                },
                "sam.gov"
              )
            )
          )
          .catch((err) => {
            console.error("[intelligence] SAM.gov broad query error:", err.message);
            return [];
          }),
      ];

  const batches = await Promise.all(fetchTasks);
  batches.forEach((batch) => results.push(...batch));
  return results;
}

// ---------------------------------------------------------------------------
// Source: USASpending.gov
// ---------------------------------------------------------------------------

async function fetchUSASpending(naicsCodes, daysBack) {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - daysBack);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const filters = {
    award_type_codes: ["A", "B", "C", "D"],
    time_period: [{ start_date: fmt(fromDate), end_date: fmt(today) }],
  };
  if (naicsCodes.length) {
    filters.naics_codes = naicsCodes.slice(0, 20);
  }

  try {
    const resp = await fetch(
      "https://api.usaspending.gov/api/v2/search/spending_by_award/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          fields: [
            "Award ID",
            "Recipient Name",
            "Awarding Agency",
            "Award Amount",
            "Description",
            "naics_code",
            "Award Date",
            "Period of Performance Current End Date",
          ],
          limit: 100,
          page: 1,
          sort: "Award Date",
          order: "desc",
        }),
      }
    );
    const data = await resp.json();
    return (data.results || []).map((item) => {
      const awardId = item["Award ID"] || item.generated_internal_id;
      return normalize(
        {
          ...item,
          noticeId: `usa_${awardId}`,
          title: item.Description || `Contract ${awardId}`,
          url: `https://www.usaspending.gov/award/${awardId}`,
          opportunityType: "Contract Award",
        },
        "usaspending.gov"
      );
    });
  } catch (err) {
    console.error("[intelligence] USASpending.gov error:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: SBIR.gov
// ---------------------------------------------------------------------------

async function fetchSBIR(naicsCodes) {
  try {
    const resp = await fetch(
      "https://api.sbir.gov/public/api/solicitations?open=true&rows=100&start=0"
    );
    const raw = await resp.json();
    const items = Array.isArray(raw)
      ? raw
      : raw.results ?? raw.solicitations ?? [];

    return items
      .filter((item) => {
        if (!naicsCodes.length) return true;
        const naics = item.naics || item.naics_code;
        return !naics || naicsCodes.includes(String(naics));
      })
      .map((item) => {
        const solId = item.solicitation_number || item.id;
        return normalize(
          {
            ...item,
            noticeId: `sbir_${solId}`,
            title: item.solicitation_title || item.title,
            agency: item.agency || item.department,
            naicsCode: item.naics || item.naics_code,
            set_aside: "Small Business",
            postedDate: item.open_date || item.release_date,
            responseDate: item.close_date || item.deadline,
            description: item.program_description || "",
            opportunityType: item.program || "SBIR/STTR",
            url:
              item.solicitation_agency_url ||
              "https://www.sbir.gov/solicitations",
          },
          "sbir.gov"
        );
      });
  } catch (err) {
    console.error("[intelligence] SBIR.gov error:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: Grants.gov
// ---------------------------------------------------------------------------

async function fetchGrants() {
  try {
    const resp = await fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: "",
        oppStatuses: "posted",
        rows: 100,
        startRecordNum: 0,
        sortBy: "openDate|desc",
      }),
    });
    const data = await resp.json();
    return (data.data?.oppHits || []).map((item) => {
      const oppId = item.id || item.oppNumber;
      return normalize(
        {
          ...item,
          noticeId: `grants_${oppId}`,
          agency: item.agencyName || item.agency,
          postedDate: item.openDate || item.postedDate,
          responseDate: item.closeDate,
          description: item.synopsis || "",
          opportunityType: "Grant",
          url: `https://grants.gov/search-results-detail/${oppId}`,
        },
        "grants.gov"
      );
    });
  } catch (err) {
    console.error("[intelligence] Grants.gov error:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "this", "to", "was", "were", "will", "with", "contract",
  "services", "support", "program", "project", "system", "systems",
  "management", "service", "federal", "government", "solicitation",
  "request", "proposal", "rfp", "rfq", "sources", "sought", "notice",
]);

function topN(counter, n) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function analyze(opportunities) {
  const agencyCounter = {};
  const naicsCounter = {};
  const setAsideCounter = {};
  const sourceCounter = {};
  const keywordCounter = {};

  for (const opp of opportunities) {
    if (opp.agency) agencyCounter[opp.agency] = (agencyCounter[opp.agency] || 0) + 1;
    if (opp.naicsCode) naicsCounter[opp.naicsCode] = (naicsCounter[opp.naicsCode] || 0) + 1;
    if (opp.setAside) setAsideCounter[opp.setAside] = (setAsideCounter[opp.setAside] || 0) + 1;
    if (opp.source) sourceCounter[opp.source] = (sourceCounter[opp.source] || 0) + 1;

    const text = `${opp.title || ""} ${opp.description || ""}`.toLowerCase();
    const tokens = text.match(/[a-z]{4,}/g) || [];
    for (const token of tokens) {
      if (!STOPWORDS.has(token)) {
        keywordCounter[token] = (keywordCounter[token] || 0) + 1;
      }
    }
  }

  return {
    total: opportunities.length,
    topAgencies: topN(agencyCounter, 10).map(({ key, count }) => ({ agency: key, count })),
    topNaics: topN(naicsCounter, 10).map(({ key, count }) => ({ naicsCode: key, count })),
    topSetAsides: topN(setAsideCounter, 10).map(({ key, count }) => ({ setAside: key, count })),
    topKeywords: topN(keywordCounter, 20).map(({ key, count }) => ({ keyword: key, count })),
    sourceBreakdown: sourceCounter,
    asOf: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeScore(analysis) {
  const { total, topAgencies, topNaics, sourceBreakdown } = analysis;

  // 1. Volume (0–40)
  const volumeScore = Math.min(40, Math.round(40 * Math.min(total, 1000) / 1000));

  // 2. Active sources (0–20)
  const activeSources = Object.values(sourceBreakdown).filter((v) => v > 0).length;
  const sourceScore = Math.min(20, activeSources * 5);

  // 3. Diversity (0–20)
  const agencyDiversity = Math.min(10, topAgencies.length);
  const naicsDiversity = Math.min(10, topNaics.length);
  const diversityScore = agencyDiversity + naicsDiversity;

  // 4. Source span (0–20)
  const spanScore = Math.min(20, Object.keys(sourceBreakdown).length * 5);

  return Math.max(0, Math.min(100, volumeScore + sourceScore + diversityScore + spanScore));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function buildSummary(analysis, trendScore) {
  const { total, topAgencies, topNaics, sourceBreakdown } = analysis;
  const sources = Object.keys(sourceBreakdown);

  const label =
    trendScore >= 80 ? "very strong" :
    trendScore >= 60 ? "strong" :
    trendScore >= 40 ? "moderate" :
    trendScore >= 20 ? "low" : "minimal";

  const parts = [
    `The GovCon scanner analyzed ${total.toLocaleString()} records across ${sources.length} federal database(s) (${sources.join(", ") || "none"}).`,
  ];

  if (topAgencies.length) {
    parts.push(
      `The most active contracting agency is ${topAgencies[0].agency} with ${topAgencies[0].count} opportunities.`
    );
  }
  if (topNaics.length) {
    parts.push(
      `NAICS code ${topNaics[0].naicsCode} leads in frequency (${topNaics[0].count} records).`
    );
  }
  if (topAgencies.length > 1) {
    const others = topAgencies
      .slice(1, 3)
      .map((a) => a.agency)
      .filter(Boolean)
      .join(", ");
    if (others) parts.push(`Other notable agencies include ${others}.`);
  }
  parts.push(`Overall market activity is ${label} (trend score: ${trendScore}/100).`);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collect opportunities from all federal databases, analyse, and cache.
 *
 * @param {string[]} naicsCodes - NAICS codes to filter by (empty = no filter)
 * @param {number}   daysBack   - Look back window in days
 * @returns {Promise<{ score: number, summary: string, analysis: object, lastRefreshed: string }>}
 */
export async function collectAndAnalyze(naicsCodes = [], daysBack = 30) {
  const [sam, usas, sbir, grants] = await Promise.all([
    fetchSam(naicsCodes, daysBack),
    fetchUSASpending(naicsCodes, daysBack),
    fetchSBIR(naicsCodes),
    fetchGrants(),
  ]);

  // Deduplicate by noticeId
  const seen = new Set();
  const opportunities = [];
  for (const opp of [...sam, ...usas, ...sbir, ...grants]) {
    const id = opp.noticeId;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    opportunities.push(opp);
  }

  const analysis = analyze(opportunities);
  const trendScore = computeScore(analysis);
  const summary = buildSummary(analysis, trendScore);
  const lastRefreshed = new Date().toISOString();

  _cache = { score: trendScore, summary, analysis, lastRefreshed };
  return _cache;
}

/**
 * Return the most recent cached result (or null if not yet populated).
 *
 * @returns {{ score: number, summary: string, analysis: object, lastRefreshed: string } | null}
 */
export function getCached() {
  return _cache;
}
