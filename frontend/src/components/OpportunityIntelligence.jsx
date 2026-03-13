import React, { useState, useEffect, useCallback } from "react";
import { intelligenceApi } from "../utils/api.js";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBadge({ score }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-800 border-green-200" :
    score >= 60 ? "bg-blue-100 text-blue-800 border-blue-200" :
    score >= 40 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
    "bg-red-100 text-red-800 border-red-200";

  const label =
    score >= 80 ? "Very Strong" :
    score >= 60 ? "Strong" :
    score >= 40 ? "Moderate" :
    score >= 20 ? "Low" : "Minimal";

  return (
    <div className={`inline-flex flex-col items-center justify-center rounded-xl border px-6 py-4 ${color}`}>
      <span className="text-4xl font-bold leading-none">{score}</span>
      <span className="text-xs font-semibold mt-1 uppercase tracking-wide">{label}</span>
      <span className="text-xs mt-0.5 opacity-70">/ 100</span>
    </div>
  );
}

function StatList({ title, items, keyField, labelField, countField }) {
  if (!items || items.length === 0) return null;
  const maxCount = items[0][countField] || 1;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">{title}</h4>
      <ol className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <li key={item[keyField] || i} className="text-sm">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-slate-700 truncate max-w-[70%]">{item[labelField] || "—"}</span>
              <span className="text-slate-500 text-xs shrink-0 ml-2">{item[countField]}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.round((item[countField] / maxCount) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SourceBreakdown({ sourceBreakdown }) {
  if (!sourceBreakdown) return null;
  const entries = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-2">Source Breakdown</h4>
      <div className="flex flex-wrap gap-2">
        {entries.map(([source, count]) => (
          <span
            key={source}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
          >
            <span>{source}</span>
            <span className="bg-slate-300 text-slate-600 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              {count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function OpportunityIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [naicsInput, setNaicsInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await intelligenceApi.get();
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load intelligence data.";
      // 404 means not yet collected — show empty state rather than error
      if (err.response?.status === 404) {
        setData(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    try {
      const naicsCodes = naicsInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await intelligenceApi.refresh({ naicsCodes, daysBack: 30 });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  const analysis = data?.analysis || {};

  return (
    <div className="space-y-4">
      {/* Header + Refresh */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Opportunity Intelligence</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Aggregated insights from SAM.gov, USASpending.gov, SBIR.gov, and Grants.gov.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <input
              type="text"
              value={naicsInput}
              onChange={(e) => setNaicsInput(e.target.value)}
              placeholder="NAICS codes (comma-separated, optional)"
              className="input text-sm w-full sm:w-64"
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary shrink-0"
            >
              {refreshing ? "Refreshing…" : "Refresh Data"}
            </button>
          </div>
        </div>

        {data?.lastRefreshed && (
          <p className="text-xs text-slate-400 mt-3">
            Last refreshed: {new Date(data.lastRefreshed).toLocaleString()}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card text-center text-slate-400 py-10">
          Loading intelligence data…
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div className="card text-center py-10">
          <p className="text-slate-500 font-medium">No data collected yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Click <strong>Refresh Data</strong> to scan all federal opportunity databases.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <>
          {/* Score + Summary */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="shrink-0">
                <ScoreBadge score={data.score ?? 0} />
                <p className="text-xs text-slate-400 text-center mt-1">Trend Score</p>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Summary</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{data.summary}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {analysis.total?.toLocaleString() ?? 0} total records analysed
                </p>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card">
              <StatList
                title="Top Agencies"
                items={analysis.topAgencies}
                keyField="agency"
                labelField="agency"
                countField="count"
              />
            </div>

            <div className="card">
              <StatList
                title="Top NAICS Codes"
                items={analysis.topNaics}
                keyField="naicsCode"
                labelField="naicsCode"
                countField="count"
              />
            </div>

            <div className="card">
              <StatList
                title="Top Set-Asides"
                items={analysis.topSetAsides}
                keyField="setAside"
                labelField="setAside"
                countField="count"
              />
            </div>

            <div className="card">
              <StatList
                title="Top Keywords"
                items={analysis.topKeywords}
                keyField="keyword"
                labelField="keyword"
                countField="count"
              />
            </div>

            <div className="card sm:col-span-2 lg:col-span-2">
              <SourceBreakdown sourceBreakdown={analysis.sourceBreakdown} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
