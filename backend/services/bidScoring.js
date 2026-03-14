const POSITIVE_SIGNALS = [
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

const NEGATIVE_SIGNALS = [
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

const FAR_DFARS_CLAUSES = [
  { name: "FAR 52.212-1", terms: ["52.212-1", "instructions to offerors"] },
  { name: "FAR 52.212-2", terms: ["52.212-2", "evaluation"] },
  { name: "FAR 52.219-6", terms: ["52.219-6", "small business set-aside"] },
  { name: "FAR 52.233-1", terms: ["52.233-1", "disputes"] },
  { name: "DFARS 252.204-7012", terms: ["252.204-7012", "covered defense information"] },
  { name: "DFARS 252.204-7020", terms: ["252.204-7020", "nist sp 800-171 dod assessment"] },
  { name: "DFARS 252.215-7008", terms: ["252.215-7008"] }
];

export function detectClauses(text = "") {
  const lower = text.toLowerCase();
  return FAR_DFARS_CLAUSES
    .filter((clause) => clause.terms.some((term) => lower.includes(term)))
    .map((clause) => clause.name);
}

export function calculateBidScore(text = "") {
  const lower = text.toLowerCase();
  let positive = 0;
  let negative = 0;
  const flags = [];

  for (const signal of POSITIVE_SIGNALS) {
    if (signal.tests.some((term) => lower.includes(term))) {
      positive += signal.points;
      flags.push(`+ ${signal.label}`);
    }
  }

  for (const signal of NEGATIVE_SIGNALS) {
    if (signal.tests.some((term) => lower.includes(term))) {
      negative += signal.points;
      flags.push(`- ${signal.label}`);
    }
  }

  let score = Math.min(100, Math.max(0, 50 + positive - negative));

  const recommendation =
    score >= 75 ? "Strong Bid"
    : score >= 60 ? "Bid with Review"
    : score >= 40 ? "Borderline"
    : "No-Bid";

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

  const summary =
    score >= 75 ? "Opportunity appears structurally favorable."
    : score >= 60 ? "Opportunity may be viable, but merits leadership review."
    : score >= 40 ? "Opportunity has meaningful friction and should be screened carefully."
    : "Opportunity appears expensive or strategically weak.";

  return {
    bidScore: score,
    recommendation,
    estimatedHours,
    estimatedProposalCost,
    flags,
    summary: [summary]
  };
}
