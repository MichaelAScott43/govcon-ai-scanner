import React, { useState, useEffect } from "react";
import { marginsApi } from "../utils/api.js";

function LeakageBar({ category, estimatedCost, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{category}</span>
        <span className="text-slate-500">{count} opps · ${estimatedCost.toLocaleString()}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-red-400 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-xs text-slate-400">N/A</span>;
  const color = score >= 75 ? "bg-emerald-100 text-emerald-700"
    : score >= 60 ? "bg-blue-100 text-blue-700"
    : score >= 40 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

export default function MarginLeakage() {
  const [summary, setSummary] = useState(null);
  const [supplierRisk, setSupplierRisk] = useState(null);
  const [agencyTrends, setAgencyTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([marginsApi.summary(), marginsApi.supplierRisk(), marginsApi.agencyTrends()])
      .then(([s, r, a]) => {
        setSummary(s.data.summary);
        setSupplierRisk(r.data);
        setAgencyTrends(a.data.agencyStats);
      })
      .catch(() => setError("Failed to load margin analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500 py-8 text-center">Loading margin analytics…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 py-4">{error}</p>;
  }

  const tabs = ["summary", "supplier-risk", "agency-trends"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Margin Leakage Analytics</h2>
        <p className="text-sm text-slate-500">Identify cost overruns and margin erosion patterns</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
              activeTab === t
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-navy-400"
            }`}
          >
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {activeTab === "summary" && summary && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xl font-bold text-slate-800">{summary.totalOpportunities}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Opportunities</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
              <p className="text-xl font-bold text-red-700">${(summary.estimatedLeakage / 1000).toFixed(0)}K</p>
              <p className="text-xs text-red-500 mt-0.5">Est. Proposal Cost Leakage</p>
            </div>
          </div>

          {summary.leakageCategories?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Leakage by Category</h3>
              <div className="space-y-4">
                {summary.leakageCategories.map((cat) => (
                  <div key={cat.category}>
                    <LeakageBar
                      category={cat.category}
                      estimatedCost={cat.estimatedCost}
                      count={cat.count}
                      total={summary.totalOpportunities}
                    />
                    <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.riskOpportunities?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">High-Risk Opportunities</h3>
              <div className="space-y-2">
                {summary.riskOpportunities.map((opp, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">{opp.title}</p>
                      <p className="text-xs text-slate-400">{opp.agency} · Due {opp.responseDeadLine || "N/A"}</p>
                    </div>
                    <ScoreBadge score={opp.bidScore} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "supplier-risk" && supplierRisk && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              {supplierRisk.count} at-risk supplier{supplierRisk.count !== 1 ? "s" : ""} with total contract exposure of{" "}
              <span className="font-bold">${(supplierRisk.totalContractExposure / 1e6).toFixed(2)}M</span>
            </p>
          </div>
          <div className="space-y-2">
            {supplierRisk.atRiskSuppliers?.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.tier} · {s.activeContracts} active contracts</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === "probation" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                  }`}>{s.status}</span>
                  {s.overallScore != null && <ScoreBadge score={s.overallScore} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "agency-trends" && agencyTrends && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Agency Win Rate Analysis</h3>
          <div className="space-y-3">
            {agencyTrends.map((a, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 truncate">{a._id || "Unknown Agency"}</span>
                  <span className="text-xs text-slate-500 ml-2 shrink-0">
                    {a.totalOpps} opps · Avg score {a.avgBidScore != null ? Math.round(a.avgBidScore) : "N/A"}
                  </span>
                </div>
                <div className="flex gap-1 text-xs">
                  <span className="text-emerald-600">{a.strongBids} strong</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-red-500">{a.noBids} no-bid</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 flex overflow-hidden">
                  <div
                    className="bg-emerald-400 h-1.5"
                    style={{ width: `${a.totalOpps > 0 ? (a.strongBids / a.totalOpps) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-red-300 h-1.5"
                    style={{ width: `${a.totalOpps > 0 ? (a.noBids / a.totalOpps) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
