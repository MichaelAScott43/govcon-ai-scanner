import axios from "axios";

const SAM_BASE_URL = "https://api.sam.gov/opportunities/v2/search";

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => {
      return value !== undefined && value !== null && value !== "";
    })
  );
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
    throw new Error("Missing SAM_API_KEY in environment variables.");
  }

  if (!postedFrom || !postedTo) {
    throw new Error("postedFrom and postedTo are required.");
  }

  const offset = (page - 1) * limit;

  const params = cleanParams({
    api_key: process.env.SAM_API_KEY,
    postedFrom,
    postedTo,
    limit,
    offset,
    keyword,
    naics,
    psc,
    typeOfSetAside: setAside,
    noticeType
  });

  const response = await axios.get(SAM_BASE_URL, {
    params,
    timeout: 30000
  });

  return response.data;
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