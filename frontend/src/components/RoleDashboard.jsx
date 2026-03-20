import React, { useState, useEffect } from "react";
import { dashboardApi } from "../utils/api.js";

const ROLES = [
  { id: "capture", label: "Capture" },
  { id: "procurement", label: "Procurement" },
  { id: "ops", label: "Operations" },
  { id: "exec", label: "Executive" }
];

function KpiCard({ label, value, sub, accent = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700"
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colors[accent]?.split(" ")[1] ?? "text-slate-800"}`}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function CaptureDash({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Saved Opportunities" value={data.kpis.savedOpportunities} accent="blue" />
        <KpiCard label="Active Capture Workflows" value={data.kpis.activeWorkflows} accent="green" />
        <KpiCard
          label="Est. Pipeline Value"
          value={`$${(data.kpis.pipelineValue / 1e6).toFixed(1)}M`}
          accent="purple"
        />
      </div>
      {data.recentOpportunities?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Opportunities</h3>
          <div className="space-y-2">
            {data.recentOpportunities.map((opp, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{opp.title}</p>
                  <p className="text-xs text-slate-500">{opp.agency} · Due {opp.responseDeadLine || "N/A"}</p>
                </div>
                {opp.bidScore != null && (
                  <span className={`ml-3 shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                    opp.bidScore >= 75 ? "bg-emerald-100 text-emerald-700"
                    : opp.bidScore >= 60 ? "bg-blue-100 text-blue-700"
                    : opp.bidScore >= 40 ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                  }`}>
                    {opp.bidScore}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcurementDash({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Active Workflows" value={data.kpis.activeWorkflows} accent="blue" />
        <KpiCard label="Active Suppliers" value={data.kpis.activeSuppliers} accent="green" />
        <KpiCard label="Pending Tasks" value={data.kpis.pendingTasks} accent="amber" />
      </div>
      {data.supplierSummary?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Supplier Status Breakdown</h3>
          <div className="space-y-2">
            {data.supplierSummary.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm">
                <span className="font-medium capitalize text-slate-700">{s._id}</span>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{s.count} suppliers</span>
                  {s.avgScore != null && (
                    <span className="font-semibold text-slate-700">Avg Score: {Math.round(s.avgScore)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpsDash({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Workflows" value={data.kpis.totalWorkflows} accent="blue" />
        <KpiCard label="Active" value={data.kpis.activeWorkflows} accent="green" />
        <KpiCard label="Completed" value={data.kpis.completedWorkflows} accent="purple" />
        <KpiCard label="Paused" value={data.kpis.pausedWorkflows} accent="amber" />
        <KpiCard
          label="Task Completion Rate"
          value={`${data.kpis.taskCompletionRate}%`}
          sub={`${data.taskStats?.completed ?? 0} / ${data.taskStats?.total ?? 0} tasks`}
          accent={data.kpis.taskCompletionRate >= 70 ? "green" : "amber"}
        />
      </div>
    </div>
  );
}

function ExecDash({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active Users" value={data.kpis.totalUsers} accent="blue" />
        <KpiCard label="Total Opportunities" value={data.kpis.totalOpportunities} accent="green" />
        <KpiCard label="Total Suppliers" value={data.kpis.totalSuppliers} accent="purple" />
        <KpiCard label="Avg Supplier Score" value={data.kpis.avgSupplierScore} accent="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.workflowSummary?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Workflow Summary</h3>
            <div className="space-y-2">
              {data.workflowSummary.map((w, i) => (
                <div key={i} className="flex justify-between rounded-lg border border-slate-100 bg-white px-4 py-2.5 text-sm">
                  <span className="capitalize text-slate-600">{w._id}</span>
                  <span className="font-semibold text-slate-800">{w.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.topAgencies?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Agencies</h3>
            <div className="space-y-2">
              {data.topAgencies.map((a, i) => (
                <div key={i} className="flex justify-between rounded-lg border border-slate-100 bg-white px-4 py-2.5 text-sm">
                  <span className="text-slate-600 truncate">{a._id || "Unknown"}</span>
                  <span className="font-semibold text-slate-800 ml-2 shrink-0">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoleDashboard() {
  const [activeRole, setActiveRole] = useState("capture");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    dashboardApi[activeRole]()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [activeRole]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2 flex-wrap">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRole(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              activeRole === r.id
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-navy-400 hover:text-navy-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 py-8 justify-center">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading dashboard…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {activeRole === "capture" && <CaptureDash data={data} />}
          {activeRole === "procurement" && <ProcurementDash data={data} />}
          {activeRole === "ops" && <OpsDash data={data} />}
          {activeRole === "exec" && <ExecDash data={data} />}
        </>
      )}
    </div>
  );
}
