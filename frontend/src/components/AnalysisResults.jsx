import React from "react";

const SCORE_COLOR = {
  "Strong Bid": "bg-green-100 text-green-800 border-green-200",
  "Bid with Review": "bg-blue-100 text-blue-800 border-blue-200",
  Borderline: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "No-Bid": "bg-red-100 text-red-800 border-red-200"
};

function ScoreMeter({ score }) {
  const color =
    score >= 75 ? "bg-green-500"
    : score >= 60 ? "bg-blue-500"
    : score >= 40 ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${score}%` }}
      />
import React, { useState } from "react";

const RECOMMENDATION_STYLE = {
  "Strong Bid":    { badge: "badge-green",  bar: "bg-emerald-500", label: "Strong Bid" },
  "Bid with Review": { badge: "badge-blue", bar: "bg-blue-500",   label: "Bid with Review" },
  "Borderline":    { badge: "badge-yellow", bar: "bg-amber-500",  label: "Borderline" },
  "No-Bid":        { badge: "badge-red",    bar: "bg-red-500",    label: "No-Bid" }
};

function ScoreGauge({ score }) {
  const style = RECOMMENDATION_STYLE[
    score >= 75 ? "Strong Bid"
    : score >= 60 ? "Bid with Review"
    : score >= 40 ? "Borderline"
    : "No-Bid"
  ];

  // SVG arc gauge
  const r = 40;
  const cx = 56, cy = 56;
  const circumference = Math.PI * r;   // half-circle
  const filled = (score / 100) * circumference;
  const rotation = -180;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-16 mb-1">
        <svg viewBox="0 0 112 60" className="w-full h-full">
          {/* Track */}
          <path
            d={`M 16 56 A 40 40 0 0 1 96 56`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M 16 56 A 40 40 0 0 1 96 56`}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className={
              score >= 75 ? "text-emerald-500"
              : score >= 60 ? "text-blue-500"
              : score >= 40 ? "text-amber-500"
              : "text-red-500"
            }
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
          <span className="text-2xl font-bold text-slate-800 leading-none">{score}</span>
          <span className="text-[10px] text-slate-400">/ 100</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResults({ result }) {
function exportAnalysis(result) {
  const rows = [{
    "Bid Score": result.bidScore,
    "Recommendation": result.recommendation,
    "Estimated Hours": result.estimatedHours,
    "Proposal Cost": result.estimatedProposalCost,
    "File": result.fileName || "Pasted Text",
    "Positive Signals": (result.flags || []).filter((f) => f.startsWith("+")).map((f) => f.slice(2)).join("; "),
    "Risk Signals": (result.flags || []).filter((f) => f.startsWith("-")).map((f) => f.slice(2)).join("; "),
    "Clauses Detected": (result.clausesDetected || []).join("; ")
  }];
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((r) =>
    headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
  )];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "bid-analysis.csv" });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AnalysisResults({ result }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!result) return null;

  const {
    fileName,
    bidScore,
    recommendation,
    estimatedHours,
    estimatedProposalCost,
    flags = [],
    summary = [],
    clausesDetected = [],
    extractedTextPreview,
    disclaimer
  } = result;

  const positiveFlags = flags.filter((f) => f.startsWith("+"));
  const negativeFlags = flags.filter((f) => f.startsWith("-"));
  const badgeClass = SCORE_COLOR[recommendation] || "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="space-y-4">
      {/* Score summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-500 mb-1">Bid Score</p>
          <p className="text-3xl font-bold text-slate-800">{bidScore}</p>
          <p className="text-xs text-slate-400 mt-1">out of 100</p>
          <ScoreMeter score={bidScore} />
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500 mb-1">Recommendation</p>
          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold border ${badgeClass}`}>
            {recommendation}
          </span>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500 mb-1">Est. Hours</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">{estimatedHours}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500 mb-1">Proposal Cost</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">{estimatedProposalCost}</p>
        </div>
      </div>

      {/* Signals + Clauses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">Score Breakdown</h3>
          {positiveFlags.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Positive Signals</p>
              <ul className="space-y-1">
                {positiveFlags.map((f, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span>
  const recStyle = RECOMMENDATION_STYLE[recommendation] || { badge: "badge-slate", bar: "bg-slate-400", label: recommendation };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-title">Analysis Complete</h3>
          {fileName && <p className="section-subtitle">{fileName}</p>}
        </div>
        <button onClick={() => exportAnalysis(result)} className="btn-secondary text-xs py-1.5 px-3">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </button>
      </div>

      {/* ── Score summary row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Gauge */}
        <div className="card text-center flex flex-col items-center justify-center gap-2">
          <p className="stat-label">Bid Score</p>
          <ScoreGauge score={bidScore} />
        </div>

        {/* Recommendation */}
        <div className="card flex flex-col items-center justify-center gap-2 text-center">
          <p className="stat-label">Decision</p>
          <span className={`badge text-sm py-1.5 px-4 ${recStyle.badge}`}>
            {recStyle.label}
          </span>
        </div>

        {/* Hours */}
        <div className="card text-center">
          <p className="stat-label mb-2">Estimated Effort</p>
          <p className="text-xl font-bold text-slate-800">{estimatedHours || "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">proposal hours</p>
        </div>

        {/* Cost */}
        <div className="card text-center">
          <p className="stat-label mb-2">Proposal Cost</p>
          <p className="text-xl font-bold text-slate-800">{estimatedProposalCost || "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">estimated cost</p>
        </div>
      </div>

      {/* ── Score bar ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bid Confidence</p>
          <span className={`badge ${recStyle.badge}`}>{bidScore}/100</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${recStyle.bar}`}
            style={{ width: `${bidScore}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">No-Bid</span>
          <span className="text-[10px] text-slate-400">Borderline (40)</span>
          <span className="text-[10px] text-slate-400">Bid (60)</span>
          <span className="text-[10px] text-slate-400">Strong (75)</span>
        </div>
      </div>

      {/* ── Signals + Clauses ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signals */}
        <div className="card">
          <h3 className="section-title mb-4">Score Breakdown</h3>

          {positiveFlags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                ✓ Positive Signals ({positiveFlags.length})
              </p>
              <ul className="space-y-2">
                {positiveFlags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">+</span>
                    <span>{f.slice(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {negativeFlags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Risk Signals</p>
              <ul className="space-y-1">
                {negativeFlags.map((f, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">✗</span>

          {negativeFlags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                ✗ Risk Signals ({negativeFlags.length})
              </p>
              <ul className="space-y-2">
                {negativeFlags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">−</span>
                    <span>{f.slice(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {flags.length === 0 && <p className="text-sm text-slate-400">No signals detected.</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-3">FAR / DFARS Clauses</h3>
          {clausesDetected.length > 0 ? (
            <ul className="space-y-1">
              {clausesDetected.map((c, i) => (
                <li key={i} className="text-sm font-mono bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No clauses detected.</p>

          {flags.length === 0 && (
            <p className="text-sm text-slate-400">No signals detected in this document.</p>
          )}
        </div>

        {/* Clauses */}
        <div className="card">
          <h3 className="section-title mb-4">FAR / DFARS Clauses Detected</h3>
          {clausesDetected.length > 0 ? (
            <div className="space-y-1.5">
              {clausesDetected.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-navy-50 border border-navy-200 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-navy-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs font-mono font-semibold text-navy-700">{c}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No FAR/DFARS clauses detected.</p>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {summary.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-2">Executive Summary</h3>
          {summary.map((s, i) => (
            <p key={i} className="text-slate-700 text-sm">{s}</p>
          ))}
        </div>
      )}

      {/* Document Preview */}
      {extractedTextPreview && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-2">
            Document Preview {fileName && <span className="text-slate-500 font-normal text-sm">— {fileName}</span>}
          </h3>
          <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-4 overflow-auto max-h-48 whitespace-pre-wrap">
            {extractedTextPreview}
          </pre>
      {/* ── Executive Summary ── */}
      {summary.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-3">Executive Summary</h3>
          <div className="space-y-2">
            {summary.map((s, i) => (
              <p key={i} className="text-sm text-slate-700 leading-relaxed">{s}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Document Preview ── */}
      {extractedTextPreview && (
        <div className="card">
          <button
            type="button"
            onClick={() => setPreviewOpen((o) => !o)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="section-title">
              Document Preview
              {fileName && <span className="ml-2 text-slate-400 font-normal text-sm">— {fileName}</span>}
            </h3>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${previewOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {previewOpen && (
            <pre className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap border border-slate-200 animate-fade-in">
              {extractedTextPreview}
            </pre>
          )}
        </div>
      )}

      {disclaimer && (
        <p className="text-center text-xs text-slate-400">{disclaimer}</p>
        <p className="text-center text-xs text-slate-400 py-2">{disclaimer}</p>
      )}
    </div>
  );
}

