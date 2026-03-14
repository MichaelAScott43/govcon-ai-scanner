import dotenv from "dotenv";

dotenv.config();

const SAM_BASE_URL = "https://api.sam.gov/opportunities/v1/search";

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function toIsoDate(value) {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Accept MM/DD/YYYY and convert to YYYY-MM-DD
  const parts = value.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map((p) => p.trim());
    if (month && day && year && !isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  throw new Error(`Invalid date format: "${value}". Expected YYYY-MM-DD or MM/DD/YYYY.`);
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
    const err = new Error(
      "SAM_API_KEY is not configured. Add it to your .env file and restart."
    );
    err.code = "MISSING_API_KEY";
    throw err;
  }

  if (!postedFrom || !postedTo) {
    throw new Error("postedFrom and postedTo are required.");
  }

  const offset = (page - 1) * limit;

  const params = cleanParams({
    api_key: process.env.SAM_API_KEY,
    postedFrom: toIsoDate(postedFrom),
    postedTo: toIsoDate(postedTo),
    limit,
    offset,
    keyword,
    naics,
    psc,
    setAside,
    noticeType
  });

  const url = `${SAM_BASE_URL}?${new URLSearchParams(params).toString()}`;
  const safeUrl = url.replace(/api_key=[^&]+(&|$)/, "api_key=***REDACTED***$1");
  console.log("SAM request:", safeUrl);

  const response = await fetch(url);

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("SAM returned invalid JSON: " + text.slice(0, 200));
  }

  if (!response.ok) {
    throw new Error(data?.message || `SAM API request failed with status ${response.status}`);
  }

  return data;
}

export function normalizeOpportunity(item = {}) {
  return {
    noticeId: item.noticeId || item._id || null,
    title: item.title || null,
    solicitationNumber: item.solicitationNumber || null,
    agency: item.fullParentPathName || item.departmentIndAgency || null,
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
      (item.noticeId ? `https://sam.gov/opp/${item.noticeId}/view` : null)
  };
}
