import React, { useState, useEffect, useRef } from "react";
import Header from "./Header.jsx";
import SearchForm from "./SearchForm.jsx";
import AnalysisResults from "./AnalysisResults.jsx";
import { opportunitiesApi, emailApi } from "../utils/api.js";
import { getUser } from "../utils/auth.js";

const TABS = [
  { id: "search", label: "SAM.gov Search" },
  { id: "analyze", label: "Document Analysis" },
  { id: "saved", label: "Saved Opportunities" },
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "./Header.jsx";
import SearchForm from "./SearchForm.jsx";
import AnalysisResults from "./AnalysisResults.jsx";
import OpportunityIntelligence from "./OpportunityIntelligence.jsx";
import { opportunitiesApi, emailApi } from "../utils/api.js";
import { getUser } from "../utils/auth.js";

/* ─── helpers ────────────────────────────────────────────────── */
function sanitizeCsvCell(value) {
  const str = value == null ? "" : String(value);
  return /^[=+\-@]/.test(str) ? "'" + str : str;
}

function exportCSV(rows, filename = "govcon-export.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((r) =>
    headers.map((h) => JSON.stringify(sanitizeCsvCell(r[h] ?? ""))).join(",")
  )];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ─── Sub-components ─────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent = "blue" }) {
  const accentMap = {
    blue: "text-navy-600 bg-navy-50",
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    purple: "text-purple-600 bg-purple-50"
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentMap[accent]}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={type === "success" ? "toast-success" : "toast-error"}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={type === "success"
              ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
        </svg>
        {message}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
      <div className="skeleton h-3 w-3/4 rounded" />
    </div>
  );
}
const TABS = [
  { id: "search", label: "SAM.gov Search" },
  { id: "analyze", label: "Document Analysis" },
  { id: "intelligence", label: "Intelligence" },
  { id: "saved", label: "Saved Opportunities" },
  { id: "intelligence", label: "Opportunity Intelligence" },
  { id: "email", label: "Email Settings" }
];

function OpportunityCard({ opp, onSave, saved }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
  const daysUntilDue = opp.responseDeadLine
    ? Math.ceil((new Date(opp.responseDeadLine) - Date.now()) / 86400000)
    : null;
  const urgencyBadge =
    daysUntilDue !== null && daysUntilDue <= 7 ? "badge-red"
    : daysUntilDue !== null && daysUntilDue <= 14 ? "badge-yellow"
    : "badge-slate";

  return (
    <div className="card-hover group animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={opp.uiLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm block truncate"
          >
            {opp.title || "Untitled Opportunity"}
          </a>
          <p className="text-xs text-slate-500 mt-1">
            {opp.agency || "N/A"} &bull; NAICS: {opp.naicsCode || "N/A"} &bull; {opp.setAside || "No set-aside"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Posted: {opp.postedDate || "N/A"} &bull; Due: {opp.responseDeadLine || "N/A"}
          </p>
        </div>
            className="text-navy-700 hover:text-navy-900 font-semibold text-sm block leading-snug group-hover:underline"
            className="font-medium text-sm block truncate"
            style={{ color: "#14243a" }}
          >
            {opp.title || "Untitled Opportunity"}
          </a>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {opp.agency && <span className="badge badge-navy">{opp.agency}</span>}
            {opp.naicsCode && <span className="badge badge-slate">NAICS {opp.naicsCode}</span>}
            {opp.setAside && opp.setAside !== "N/A" && (
              <span className="badge badge-blue">{opp.setAside}</span>
            )}
            {daysUntilDue !== null && (
              <span className={urgencyBadge}>
                {daysUntilDue < 0 ? "Expired" : daysUntilDue === 0 ? "Due today" : `${daysUntilDue}d left`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Posted: {opp.postedDate || "N/A"} &bull; Due: {opp.responseDeadLine || "N/A"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={() => onSave(opp)}
            disabled={saved}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all duration-150 ${
              saved
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                : "bg-white text-slate-600 border-slate-200 hover:border-navy-400 hover:text-navy-600 hover:bg-navy-50"
            }`}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── FAR / DFARS Compliance Tab ────────────────────────────── */
const FAR_CLAUSES = [
  { id: "FAR 52.204-10", title: "Reporting Executive Compensation and First-Tier Subcontract Awards", category: "Reporting", risk: "medium" },
  { id: "FAR 52.212-4", title: "Contract Terms and Conditions—Commercial Products and Services", category: "Commercial", risk: "low" },
  { id: "FAR 52.215-2", title: "Audit and Records—Negotiation", category: "Audit", risk: "high" },
  { id: "FAR 52.222-26", title: "Equal Opportunity", category: "Labor", risk: "low" },
  { id: "FAR 52.222-35", title: "Equal Opportunity for Veterans", category: "Labor", risk: "low" },
  { id: "FAR 52.227-14", title: "Rights in Data—General", category: "IP", risk: "medium" },
  { id: "DFARS 252.204-7012", title: "Safeguarding Covered Defense Information", category: "Cybersecurity", risk: "high" },
  { id: "DFARS 252.225-7001", title: "Buy American and Balance of Payments Program", category: "Trade", risk: "medium" },
  { id: "DFARS 252.227-7013", title: "Rights in Technical Data—Noncommercial Items", category: "IP", risk: "high" },
  { id: "DFARS 252.246-7003", title: "Notification of Potential Safety Issues", category: "Safety", risk: "medium" }
];

function FARDFARSTab() {
  const [checked, setChecked] = useState({});
  const [filter, setFilter] = useState("all");
  const categories = ["all", ...new Set(FAR_CLAUSES.map((c) => c.category))];
  const visible = filter === "all" ? FAR_CLAUSES : FAR_CLAUSES.filter((c) => c.category === filter);
  const completedCount = Object.values(checked).filter(Boolean).length;

  const riskBadge = { high: "badge-red", medium: "badge-yellow", low: "badge-green" };
  const riskLabel = { high: "High Risk", medium: "Med Risk", low: "Low Risk" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">FAR / DFARS Compliance Checklist</h2>
            <p className="section-subtitle">Review required clauses for your solicitation type</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-navy-700">{completedCount}</span> / {FAR_CLAUSES.length} reviewed
            </div>
            <div className="progress-bar w-24">
              <div
                className="progress-fill bg-navy-600"
                style={{ width: `${(completedCount / FAR_CLAUSES.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
                filter === cat
                  ? "bg-navy-600 text-white border-navy-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:text-navy-700"
              }`}
            >
              {cat === "all" ? "All Clauses" : cat}
            </button>
          ))}
        </div>

        {/* Clause list */}
        <div className="divide-y divide-slate-100">
          {visible.map((clause) => (
            <div
              key={clause.id}
              className={`flex items-start gap-3 py-3 transition-colors ${checked[clause.id] ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                id={clause.id}
                checked={!!checked[clause.id]}
                onChange={(e) => setChecked((c) => ({ ...c, [clause.id]: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-navy-600 focus:ring-navy-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor={clause.id} className="cursor-pointer">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-navy-700">{clause.id}</span>
                    <span className={riskBadge[clause.risk]}>{riskLabel[clause.risk]}</span>
                    <span className="badge badge-slate">{clause.category}</span>
                  </div>
                  <p className={`text-sm mt-0.5 ${checked[clause.id] ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {clause.title}
                  </p>
                </label>
              </div>
              {checked[clause.id] && (
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => {
              const all = {};
              FAR_CLAUSES.forEach((c) => { all[c.id] = true; });
              setChecked(all);
            }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Mark All Reviewed
          </button>
          <button
            onClick={() => setChecked({})}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Non-Classified Use Tab ────────────────────────────────── */
const NONCLAS_CHECKS = [
  { id: "nc1", title: "No classified markings present", description: "Document contains no SECRET, TOP SECRET, or SCI classification markings.", status: "pass" },
  { id: "nc2", title: "No controlled unclassified information (CUI)", description: "Verify the solicitation does not contain CUI requiring special handling.", status: "review" },
  { id: "nc3", title: "Open-source tools permissible", description: "Commercial off-the-shelf and open-source software may be used without restriction.", status: "pass" },
  { id: "nc4", title: "No ITAR/EAR-controlled technology", description: "No export-controlled technology is required for performance.", status: "review" },
  { id: "nc5", title: "Public domain data only", description: "All data used in performance is publicly available or owned by the contractor.", status: "pass" },
  { id: "nc6", title: "No cleared personnel required", description: "Solicitation does not require personnel with active security clearances.", status: "pass" }
];

function NonClassifiedTab() {
  const passed = NONCLAS_CHECKS.filter((c) => c.status === "pass").length;
  const total = NONCLAS_CHECKS.length;
  const allPass = passed === total;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="section-title">Non-Classified Use Verification</h2>
            <p className="section-subtitle">Confirm this opportunity qualifies for non-classified performance</p>
          </div>
          <div className={`badge text-sm py-1.5 px-4 ${allPass ? "badge-green" : "badge-yellow"}`}>
            {allPass ? "✓ Cleared for Non-Classified Use" : `${passed}/${total} Checks Passed`}
          </div>
        </div>

        <div className="space-y-3">
          {NONCLAS_CHECKS.map((check) => (
            <div
              key={check.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                check.status === "pass"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                check.status === "pass" ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                <svg className={`w-4 h-4 ${check.status === "pass" ? "text-emerald-600" : "text-amber-600"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={check.status === "pass"
                      ? "M5 13l4 4L19 7"
                      : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${check.status === "pass" ? "text-emerald-800" : "text-amber-800"}`}>
                  {check.title}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{check.description}</p>
              </div>
              <div className="ml-auto shrink-0">
                <span className={check.status === "pass" ? "badge-green" : "badge-yellow"}>
                  {check.status === "pass" ? "Pass" : "Review"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-navy-50 border border-navy-200 rounded-xl">
          <p className="text-xs font-semibold text-navy-800 mb-1">ℹ️ Disclaimer</p>
          <p className="text-xs text-navy-700">
            This system is designed for non-classified use only. Do not upload, process, or store classified,
            sensitive, or personally identifiable information (PII). All analysis is performed on unclassified,
            publicly available solicitation documents only.
          </p>
        </div>
        <button
          onClick={() => onSave(opp)}
          disabled={saved}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${
            saved
              ? "bg-green-50 text-green-700 border-green-200 cursor-default"
              : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
          }`}
              : "bg-white border-slate-300 hover:border-[#14243a]"
          }`}
          style={!saved ? { color: "#5d6b7c" } : {}}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = getUser();
  const [tab, setTab] = useState("search");
/* ─── Main Dashboard ─────────────────────────────────────────── */
const TABS = [
  { id: "search",    label: "SAM.gov Search",    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { id: "analyze",   label: "Bid / No-Bid",       icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "far",       label: "FAR / DFARS",        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "nonclass",  label: "Non-Classified",     icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { id: "saved",     label: "Saved",              icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
  { id: "email",     label: "Alerts",             icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }
];

export default function Dashboard() {
  const user = getUser();
  const [tab, setTab] = useState("search");
  const [toast, setToast] = useState(null);

  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeMode, setAnalyzeMode] = useState("file"); // "file" | "text"
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [analyzeMode, setAnalyzeMode] = useState("file");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // Saved opportunities state
  const [savedOpps, setSavedOpps] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Email preferences state
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  // Load saved opportunities when that tab is active
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (tab === "saved") {
      setSavedLoading(true);
      opportunitiesApi
        .getSaved()
        .then((res) => setSavedOpps(res.data.opportunities || []))
        .catch(() => {})
        .finally(() => setSavedLoading(false));
    }
    if (tab === "email") {
      emailApi
        .getPreferences()
      emailApi.getPreferences()
        .then((res) => setEmailPrefs(res.data.preferences))
        .catch(() => {});
    }
  }, [tab]);

  async function handleSave(opp) {
    try {
      await opportunitiesApi.save(opp);
      setSavedIds((s) => new Set([...s, opp.noticeId]));
    } catch {
      // silent
    }
  }

  async function handleAnalyzeFile(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setAnalyzeError("Please choose a file."); return; }
    setAnalyzeError("");
    setAnalyzeLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await opportunitiesApi.analyze(form);
      setAnalysisResult(res.data);
    } catch (err) {
      setAnalyzeError(err.response?.data?.error || "Analysis failed.");
      showToast("Opportunity saved!");
    } catch {
      showToast("Failed to save opportunity.", "error");
    }
  }

  async function runAnalysis(formDataOrText) {
    setAnalyzeError("");
    setAnalyzeLoading(true);
    setAnalysisResult(null);
    try {
      let res;
      if (formDataOrText instanceof FormData) {
        res = await opportunitiesApi.analyze(formDataOrText);
      } else {
        res = await opportunitiesApi.analyzeText(formDataOrText);
      }
      setAnalysisResult(res.data);
    } catch (err) {
      setAnalyzeError(err.response?.data?.error || "Analysis failed. Please try again.");
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleAnalyzeText(e) {
    e.preventDefault();
    if (!pastedText.trim()) { setAnalyzeError("Please paste some text."); return; }
    setAnalyzeError("");
    setAnalyzeLoading(true);
    try {
      const res = await opportunitiesApi.analyzeText(pastedText);
      setAnalysisResult(res.data);
    } catch (err) {
      setAnalyzeError(err.response?.data?.error || "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
  async function handleAnalyzeFile(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setAnalyzeError("Please choose a file."); return; }
    const form = new FormData();
    form.append("file", file);
    await runAnalysis(form);
  }

  async function handleAnalyzeText(e) {
    e.preventDefault();
    if (!pastedText.trim()) { setAnalyzeError("Please paste some text."); return; }
    await runAnalysis(pastedText);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
    }
  }

  async function handleSendDigest() {
    setEmailStatus("Sending…");
    try {
      await emailApi.sendDailyDigest();
      setEmailStatus("✓ Digest sent successfully!");
      showToast("Daily digest sent!");
    } catch (err) {
      setEmailStatus("✗ " + (err.response?.data?.error || "Send failed."));
    }
  }

  async function handleSaveEmailPrefs(e) {
    e.preventDefault();
    try {
      const res = await emailApi.updatePreferences(emailPrefs);
      setEmailPrefs(res.data.preferences);
      setEmailStatus("✓ Preferences saved.");
    } catch {
      setEmailStatus("✗ Failed to save preferences.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Welcome bar */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Your GovCon AI Scanner dashboard
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
      showToast("Alert preferences saved!");
    } catch {
      showToast("Failed to save preferences.", "error");
    }
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f7fafe" }}>
      <Header />

      {/* ── Hero metrics bar ── */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-slate-400 text-xs font-medium">{today}</p>
              <h1 className="text-white text-2xl font-bold mt-1">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Your GovCon intelligence dashboard — find and win federal contracts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green text-xs py-1.5 px-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse" />
                SAM.gov Connected
              </span>
              <span className="badge badge-blue text-xs py-1.5 px-3">AI Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Opportunities Scanned" value="2,481" sub="Last 30 days" accent="blue"
              icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            <StatCard label="Opportunities Saved" value={savedIds.size || "—"} sub="In your pipeline" accent="green"
              icon="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            <StatCard label="Avg. Bid Score" value="74" sub="Strong bid threshold" accent="amber"
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Compliance Rate" value="92%" sub="FAR/DFARS reviewed" accent="purple"
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </div>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Welcome bar */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "#14243a" }}>
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#5d6b7c" }}>
            Your GovCon AI Scanner dashboard
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Tab navigation */}
        <div className="flex gap-0 mb-6 overflow-x-auto border-b border-slate-200">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${
                tab === id
                  ? "border-navy-600 text-navy-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
        <div className="flex gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: "rgba(20,36,58,0.12)" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors`}
              style={tab === id
                ? { borderColor: "#14243a", color: "#14243a" }
                : { borderColor: "transparent", color: "#5d6b7c" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </div>

        {/* ── SAM.gov Search ── */}
        {tab === "search" && (
          <div className="space-y-4">
          <div className="space-y-4 animate-fade-in">
            <SearchForm onResults={setSearchResults} />

            {searchResults && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">
                    Results
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {searchResults.totalRecords ?? searchResults.opportunities?.length ?? 0} total
                    </span>
                  </h3>
                </div>
                {searchResults.opportunities?.length === 0 ? (
                  <p className="text-slate-400 text-sm">No opportunities found. Try broadening your search.</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="section-title">
                      Search Results
                      <span className="ml-2 badge badge-navy">
                        {searchResults.totalRecords ?? searchResults.opportunities?.length ?? 0} total
                      </span>
                    </h3>
                    <p className="section-subtitle">Click "Save" to add to your pipeline</p>
                  </div>
                  {(searchResults.opportunities?.length ?? 0) > 0 && (
                    <button
                      onClick={() => exportCSV(searchResults.opportunities, "sam-opportunities.csv")}
                      className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                  )}
                </div>

                {searchResults.opportunities?.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No opportunities found</p>
                    <p className="text-slate-400 text-sm mt-1">Try broadening your search criteria</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(searchResults.opportunities || []).map((opp, index) => (
                      <OpportunityCard
                        key={opp.noticeId ?? `opp-${index}`}
                        opp={opp}
                        onSave={handleSave}
                        saved={savedIds.has(opp.noticeId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Document Analysis ── */}
        {tab === "analyze" && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Document Analysis</h2>

              {/* Mode toggle */}
              <div className="flex rounded-lg bg-slate-100 p-1 w-fit mb-5">
                <button
                  onClick={() => { setAnalyzeMode("file"); setAnalyzeError(""); setAnalysisResult(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    analyzeMode === "file" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => { setAnalyzeMode("text"); setAnalyzeError(""); setAnalysisResult(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    analyzeMode === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {analyzeError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {/* ── Bid / No-Bid Analysis ── */}
        {tab === "analyze" && (
          <div className="space-y-4 animate-fade-in">
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="section-title">Bid / No-Bid Analysis</h2>
                  <p className="section-subtitle">Upload or paste a solicitation to get an AI-powered bid decision</p>
                </div>
                {/* Mode toggle */}
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {[{ id: "file", label: "Upload File" }, { id: "text", label: "Paste Text" }].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setAnalyzeMode(id); setAnalyzeError(""); setAnalysisResult(null); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                        analyzeMode === id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {analyzeError && (
                <div className="alert-error mb-4">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {analyzeError}
                </div>
              )}

              {analyzeMode === "file" ? (
                <form onSubmit={handleAnalyzeFile} className="space-y-4">
                  <div>
                    <label className="label">Choose Document (PDF, DOCX, or TXT)</label>
                  <div
                    className={`upload-zone ${dragOver ? "upload-zone-active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileRef.current?.click();
                      }
                    }}
                  >
                    <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-700">Drop your document here</p>
                    <p className="text-xs text-slate-500 mt-1">or click to browse — PDF, DOCX, TXT supported</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  <button type="submit" disabled={analyzeLoading} className="btn-primary">
                    {analyzeLoading ? "Analyzing…" : "Analyze Document"}
                  </button>
                      className="hidden"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#edf3fb] file:text-[#14243a] hover:file:bg-[#dce8f7] cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="submit" disabled={analyzeLoading} className="btn-primary">
                      {analyzeLoading
                        ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</>
                        : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Analyze Document</>}
                    </button>
                    <p className="text-xs text-slate-400">AI-powered scoring takes 10–30 seconds</p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAnalyzeText} className="space-y-4">
                  <div>
                    <label className="label">Paste Solicitation Text</label>
                    <textarea
                      className="input h-48 resize-y"
                      placeholder="Paste solicitation text, clauses, or statement of work…"
                      className="input h-52 resize-y font-mono text-xs leading-relaxed"
                      placeholder="Paste solicitation text, statement of work, or relevant clauses here…"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={analyzeLoading} className="btn-primary">
                    {analyzeLoading ? "Analyzing…" : "Analyze Text"}
                    {analyzeLoading
                      ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</>
                      : "Analyze Text"}
                  </button>
                </form>
              )}
            </div>

            {analyzeLoading && (
              <div className="space-y-4">
                {[1, 2].map((i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {analysisResult && <AnalysisResults result={analysisResult} />}
          </div>
        )}

        {/* ── Saved Opportunities ── */}
        {tab === "saved" && (
          <div className="space-y-3">
            {savedLoading ? (
              <div className="card text-center text-slate-400">Loading…</div>
            ) : savedOpps.length === 0 ? (
              <div className="card text-center text-slate-400">
                <p>No saved opportunities yet.</p>
                <p className="text-sm mt-1">Search SAM.gov and save opportunities to review them here.</p>
              </div>
            ) : (
              savedOpps.map((opp) => (
                <OpportunityCard key={opp.noticeId} opp={opp} onSave={() => {}} saved />
              ))
        {/* ── FAR / DFARS ── */}
        {tab === "far" && <FARDFARSTab />}

        {/* ── Non-Classified ── */}
        {tab === "nonclass" && <NonClassifiedTab />}
        {/* ── Opportunity Intelligence ── */}
        {tab === "intelligence" && <OpportunityIntelligence />}

        {/* ── Saved Opportunities ── */}
        {tab === "saved" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Saved Opportunities</h2>
                <p className="section-subtitle">Your contracting pipeline</p>
              </div>
              {savedOpps.length > 0 && (
                <button
                  onClick={() => exportCSV(savedOpps, "saved-opportunities.csv")}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>

            {savedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : savedOpps.length === 0 ? (
              <div className="card text-center py-16">
                <svg className="w-12 h-12 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="text-slate-600 font-semibold">No saved opportunities yet</p>
                <p className="text-slate-400 text-sm mt-1">Search SAM.gov and save opportunities to build your pipeline</p>
                <button onClick={() => setTab("search")} className="btn-primary mt-4 mx-auto">
                  Search SAM.gov
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedOpps.map((opp) => (
                  <OpportunityCard key={opp.noticeId} opp={opp} onSave={() => {}} saved />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Email Alerts ── */}
        {tab === "email" && (
          <div className="space-y-4 animate-fade-in">
            <div className="card max-w-xl">
              <h2 className="section-title mb-1">Daily Opportunity Alerts</h2>
              <p className="section-subtitle mb-5">Configure how and when you receive opportunity digests</p>

              {emailPrefs ? (
                <form onSubmit={handleSaveEmailPrefs} className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Email digest enabled</p>
                      <p className="text-xs text-slate-500 mt-0.5">Receive daily opportunity summaries</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailPrefs.enabled}
                        onChange={(e) => setEmailPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-navy-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
        {/* ── Opportunity Intelligence ── */}
        {tab === "intelligence" && <OpportunityIntelligence />}

        {/* ── Email Settings ── */}
        {tab === "email" && (
          <div className="card max-w-lg">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily Email Digest Settings</h2>

            {emailPrefs ? (
              <form onSubmit={handleSaveEmailPrefs} className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="emailEnabled"
                    checked={emailPrefs.enabled}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    className="rounded border-slate-300"
                    style={{ accentColor: "#14243a" }}
                  />
                  <label htmlFor="emailEnabled" className="text-sm font-medium text-slate-700">
                    Enable daily opportunity digest
                  </label>
                </div>

                <div>
                  <label className="label">Frequency</label>
                  <select
                    className="input"
                    value={emailPrefs.frequency}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, frequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div>
                  <label className="label">Delivery Hour (0–23, local time)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={23}
                    value={emailPrefs.deliveryTime}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, deliveryTime: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="label">Minimum Bid Score (0–100)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={emailPrefs.minBidScore}
                    onChange={(e) => setEmailPrefs((p) => ({ ...p, minBidScore: Number(e.target.value) }))}
                  />
                </div>

                {emailStatus && (
                  <p className={`text-sm ${emailStatus.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
                    {emailStatus}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary">Save Preferences</button>
                  <button
                    type="button"
                    onClick={handleSendDigest}
                    className="btn-secondary"
                  >
                    Send Test Digest
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-slate-400 text-sm">Loading preferences…</p>
            )}
                  <div>
                    <label className="label">Frequency</label>
                    <div className="relative">
                      <select
                        className="select pr-10"
                        value={emailPrefs.frequency}
                        onChange={(e) => setEmailPrefs((p) => ({ ...p, frequency: e.target.value }))}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="never">Never</option>
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Delivery Hour (0–23 UTC)</label>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={23}
                        value={emailPrefs.deliveryTime}
                        onChange={(e) => setEmailPrefs((p) => ({ ...p, deliveryTime: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="label">Min Bid Score (0–100)</label>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        value={emailPrefs.minBidScore}
                        onChange={(e) => setEmailPrefs((p) => ({ ...p, minBidScore: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="submit" className="btn-primary">Save Preferences</button>
                    <button
                      type="button"
                      onClick={handleSendDigest}
                      className="btn-secondary"
                    >
                      Send Test Digest
                    </button>
                  </div>

                  {emailStatus && (
                    <p className={`text-sm flex items-center gap-2 ${emailStatus.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>
                      {emailStatus}
                    </p>
                  )}
                </form>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Designed for Non-Classified Use Only &bull; GovCon AI Scanner v2.0
      </footer>
      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} BlackCrest Sourcing Group &bull; GovCon AI Scanner
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Non-Classified Use Only</span>
            <span className="badge badge-green text-xs">SOC 2 Ready</span>
            <span className="badge badge-slate text-xs">v2.0</span>
          </div>
        </div>
      </footer>

      {/* ── Toast notifications ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
