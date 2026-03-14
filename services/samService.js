import dotenv from "dotenv";

dotenv.config();

// Optionally log SAM_API_KEY availability in non-production environments without exposing details
if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
  const hasSamApiKey = Boolean(process.env.SAM_API_KEY);
  console.log("samService: SAM_API_KEY configured:", hasSamApiKey);
}
const SAM_BASE_URL = "https://api.sam.gov/opportunities/v1/search";

const SAM_BASE_URL = "https://api.sam.gov/opportunities/v1/search";
function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => {
      return value !== undefined && value !== null && value !== "";
    })
  );
}

/**
 * Convert a date value to MM/DD/YYYY format required by the SAM.gov v1 API.
 * Accepts YYYY-MM-DD (ISO, from browser date inputs) or MM/DD/YYYY (already correct).
 */
function formatDateForSamApi(value) {
  if (!value) return value;

  // Already in MM/DD/YYYY format
// SAM.gov API expects dates in MM/DD/YYYY format.
function toSamDate(value) {
  if (!value) return value;

  // Already in MM/DD/YYYY — pass through unchanged
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }

  // Convert ISO YYYY-MM-DD → MM/DD/YYYY
  // Convert YYYY-MM-DD (ISO / HTML date input format) → MM/DD/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }

  return value;
}

export async function searchOpportunities({
  postedFrom,
  postedTo,
  keyword,
  naics,
  psc,
  setAside,
  noticeType,
  page = 1,
  limit = 100
}) {
  if (!process.env.SAM_API_KEY) {
    const err = new Error("SAM_API_KEY is not configured on the server. Add it to your .env file and restart.");
    err.code = "MISSING_API_KEY";
    throw err;
  }

  if (!postedFrom || !postedTo) {
    throw new Error("postedFrom and postedTo are required.");
  }

  const offset = (page - 1) * limit;

  const params = cleanParams({
    api_key: process.env.SAM_API_KEY,
    postedFrom: formatDateForSamApi(postedFrom),
    postedTo: formatDateForSamApi(postedTo),
    postedFrom: toSamDate(postedFrom),
    postedTo: toSamDate(postedTo),
    limit,
    offset,
    keyword,
    naics,
    psc,
    setAside,
    noticeType
  });

  const url = `${SAM_BASE_URL}?${new URLSearchParams(params).toString()}`;

  // Mask the API key in logs to avoid exposing sensitive credentials
  const safeUrl = url.replace(/api_key=[^&]+(&|$)/, "api_key=***REDACTED***$1");
  console.log("🔍 SAM request URL:", safeUrl);
  console.log("📋 SAM request params:", { postedFrom, postedTo, keyword, naics, psc, setAside, noticeType, page, limit });

  try {
    const response = await fetch(url);

    console.log("📊 SAM response status:", response.status);

    const text = await response.text();
    console.log("📝 SAM raw response:", text.substring(0, 1000));

    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Failed to parse SAM JSON response:", err.message);
      throw new Error("SAM returned invalid JSON: " + text.substring(0, 200));
    }

    if (!response.ok) {
      console.error("❌ SAM API Error response body:", JSON.stringify(data));
      const detail = data?.error?.message || data?.message || `SAM API request failed with status ${response.status}`;
      const err = new Error(detail);
      err.statusCode = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    console.error("❌ SAM Service Error:", error.message);
    throw error;
  }
}

export function normalizeOpportunity(item = {}) {
  return {
    noticeId: item.noticeId || item._id || null,
    title: item.title || null,
    solicitationNumber: item.solicitationNumber || null,
    fullParentPathName: item.fullParentPathName || null,
    departmentIndAgency: item.departmentIndAgency || null,
    subTier: item.subTier || null,
    office: item.office || null,
    postedDate: item.postedDate || null,
    responseDeadLine: item.responseDeadLine || null,
    naicsCode: item.naicsCode || null,
    pscCode: item.classificationCode || item.pscCode || null,
    setAside: item.typeOfSetAsideDescription || item.typeOfSetAside || null,
    noticeType: item.noticeType || null,
    contractType: item.typeOfContractPricing || null,
    placeOfPerformance: item.placeOfPerformance || null,
    uiLink:
      item.uiLink ||
      (item.noticeId ? `https://sam.gov/opp/${item.noticeId}/view` : null),
    raw: item
  };
}