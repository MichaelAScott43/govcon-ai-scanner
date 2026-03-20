import React, { useState, useEffect } from "react";
import { capacityApi } from "../utils/api.js";

function LoadBar({ score }) {
  const pct = Math.min(score, 200);
  const color = score > 100 ? "bg-red-500" : score >= 40 ? "bg-emerald-500" : "bg-amber-400";
  const label = score > 100 ? "Overloaded" : score >= 40 ? "Balanced" : "Under-utilized";
  const labelColor = score > 100 ? "text-red-600" : score >= 40 ? "text-emerald-600" : "text-amber-600";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">Load score: {score}</span>
        <span className={`font-semibold ${labelColor}`}>{label}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct / 2, 100)}%` }} />
      </div>
    </div>
  );
}

export default function CapacityPlanner() {
  const [overview, setOverview] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([capacityApi.overview(), capacityApi.forecast()])
      .then(([ov, fc]) => {
        setOverview(ov.data);
        setForecast(fc.data);
      })
      .catch(() => setError("Failed to load capacity data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500 py-8 text-center">Loading capacity data…</p>;
  if (error) return <p className="text-sm text-red-600 py-4">{error}</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Capacity & Load Balancing</h2>
        <p className="text-sm text-slate-500">Forecast team workload and identify bottlenecks</p>
      </div>

      <div className="flex gap-2">
        {["overview", "forecast"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
              activeTab === t
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-navy-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "overview" && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Overloaded", value: overview.summary.overloaded, color: "text-red-600" },
              { label: "Balanced", value: overview.summary.balanced, color: "text-emerald-600" },
              { label: "Under-utilized", value: overview.summary.underutilized, color: "text-amber-600" }
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {overview.team?.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Team Load</h3>
              <div className="space-y-4">
                {overview.team.map((member) => (
                  <div key={member.userId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{member.name}</span>
                      <span className="text-xs text-slate-400">
                        {member.activeWorkflows} workflows · {member.openTasks} tasks
                      </span>
                    </div>
                    <LoadBar score={member.loadScore} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-500 text-sm">No team members with active workflows yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "forecast" && forecast && (
        <div className="space-y-5">
          {forecast.overdue?.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                ⚠ {forecast.overdue.length} Overdue Workflow{forecast.overdue.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-1">
                {forecast.overdue.map((wf, i) => (
                  <div key={i} className="flex justify-between text-xs text-red-600">
                    <span>{wf.title}</span>
                    <span>{wf.daysOverdue}d overdue</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">30-Day Workflow Forecast</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {forecast.forecast?.map((week) => (
                <div key={week.week} className="rounded-xl border border-slate-100 p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Week {week.week}</p>
                  <p className="text-xs text-slate-500 mb-2">{week.weekStart}</p>
                  <p className="text-2xl font-bold text-slate-800">{week.workflowsDue}</p>
                  <p className="text-xs text-slate-500">workflows due</p>
                  <p className="text-xs text-slate-400 mt-1">{week.totalTasks} tasks</p>
                </div>
              ))}
            </div>
          </div>

          {forecast.forecast?.some((w) => w.workflows?.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Deadlines</h3>
              <div className="space-y-2">
                {forecast.forecast.flatMap((w) => w.workflows).slice(0, 10).map((wf, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 py-2">
                    <div>
                      <p className="font-medium text-slate-700">{wf.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{wf.type} · {wf.taskCount} tasks</p>
                    </div>
                    <p className="text-xs text-slate-500 shrink-0 ml-3">
                      {new Date(wf.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
