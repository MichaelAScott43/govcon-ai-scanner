import React, { useState, useEffect, useRef } from "react";
import Header from "./Header.jsx";
import SearchForm from "./SearchForm.jsx";
import AnalysisResults from "./AnalysisResults.jsx";
import OpportunityIntelligence from "./OpportunityIntelligence.jsx";
import { opportunitiesApi, emailApi } from "../utils/api.js";
import { getUser } from "../utils/auth.js";

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={opp.uiLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm block truncate"
            style={{ color: "#14243a" }}
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
        <button
          onClick={() => onSave(opp)}
          disabled={saved}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${
            saved
              ? "bg-green-50 text-green-700 border-green-200 cursor-default"
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

  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeMode, setAnalyzeMode] = useState("file"); // "file" | "text"
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [pastedText, setPastedText] = useState("");
  const fileRef = useRef(null);

  // Saved opportunities state
  const [savedOpps, setSavedOpps] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Email preferences state
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  // Load saved opportunities when that tab is active
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
    }
  }

  async function handleSendDigest() {
    setEmailStatus("Sending…");
    try {
      await emailApi.sendDailyDigest();
      setEmailStatus("✓ Digest sent successfully!");
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
    <div className="min-h-screen flex flex-col" style={{ background: "#f7fafe" }}>
      <Header />

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

        {/* Tab navigation */}
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
              {label}
            </button>
          ))}
        </div>

        {/* ── SAM.gov Search ── */}
        {tab === "search" && (
          <div className="space-y-4">
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
                ) : (
                  <div className="space-y-3">
                    {(searchResults.opportunities || []).map((opp) => (
                      <OpportunityCard
                        key={opp.noticeId || Math.random()}
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
                  {analyzeError}
                </div>
              )}

              {analyzeMode === "file" ? (
                <form onSubmit={handleAnalyzeFile} className="space-y-4">
                  <div>
                    <label className="label">Choose Document (PDF, DOCX, or TXT)</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#edf3fb] file:text-[#14243a] hover:file:bg-[#dce8f7] cursor-pointer"
                    />
                  </div>
                  <button type="submit" disabled={analyzeLoading} className="btn-primary">
                    {analyzeLoading ? "Analyzing…" : "Analyze Document"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAnalyzeText} className="space-y-4">
                  <div>
                    <label className="label">Paste Solicitation Text</label>
                    <textarea
                      className="input h-48 resize-y"
                      placeholder="Paste solicitation text, clauses, or statement of work…"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={analyzeLoading} className="btn-primary">
                    {analyzeLoading ? "Analyzing…" : "Analyze Text"}
                  </button>
                </form>
              )}
            </div>

            {analysisResult && <AnalysisResults result={analysisResult} />}
          </div>
        )}

        {/* ── Opportunity Intelligence ── */}
        {tab === "intelligence" && <OpportunityIntelligence />}

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
            )}
          </div>
        )}

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
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Designed for Non-Classified Use Only &bull; GovCon AI Scanner v2.0
      </footer>
    </div>
  );
}
