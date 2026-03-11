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
    </div>
  );
}

export default function AnalysisResults({ result }) {
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
        </div>
      )}

      {disclaimer && (
        <p className="text-center text-xs text-slate-400">{disclaimer}</p>
      )}
    </div>
  );
}
