import React, { useState } from "react";
import { opportunitiesApi } from "../utils/api.js";

const SET_ASIDE_OPTIONS = [
  { value: "", label: "Any Set-Aside" },
  { value: "SBA", label: "Small Business" },
  { value: "8A", label: "8(a) Program" },
  { value: "HZC", label: "HUBZone" },
  { value: "SDVOSBC", label: "SDVOSB — Service-Disabled Veteran" },
  { value: "WOSB", label: "WOSB — Women-Owned" },
  { value: "EDWOSB", label: "EDWOSB — Economically Disadvantaged" }
];

const NOTICE_TYPE_OPTIONS = [
  { value: "", label: "All Notice Types" },
  { value: "o", label: "Solicitation" },
  { value: "p", label: "Pre-Solicitation" },
  { value: "a", label: "Award Notice" },
  { value: "r", label: "Sources Sought" },
  { value: "s", label: "Special Notice" }
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function QuickFilter({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-all duration-150"
    >
      {label}
    </button>
  );
}

export default function SearchForm({ onResults }) {
  const [form, setForm] = useState({
    keyword: "",
    naics: "",
    psc: "",
    setAside: "",
    noticeType: "",
    postedFrom: daysAgoStr(30),
    postedTo: todayStr()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function applyQuickFilter(days) {
    setForm((f) => ({ ...f, postedFrom: daysAgoStr(days), postedTo: todayStr() }));
  }

  function handleReset() {
    setForm({
      keyword: "",
      naics: "",
      psc: "",
      setAside: "",
      noticeType: "",
      postedFrom: daysAgoStr(30),
      postedTo: todayStr()
    });
    setError("");
    onResults(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await opportunitiesApi.search(form);
      onResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Search failed. Please check your filters and try again.");
      onResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">SAM.gov Opportunity Search</h2>
          <p className="section-subtitle">Search federal contracting opportunities from SAM.gov</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="btn-ghost text-xs"
        >
          {expanded ? "Fewer filters ↑" : "More filters ↓"}
        </button>
      </div>

      {error && (
        <div className="alert-error mb-4">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="label">Keyword / Title</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="input pl-9"
                type="text"
                name="keyword"
                placeholder="e.g. cybersecurity, logistics, IT support…"
                value={form.keyword}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label className="label">NAICS Code</label>
            <input
              className="input"
              type="text"
              name="naics"
              placeholder="e.g. 541512"
              value={form.naics}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">PSC Code</label>
            <input
              className="input"
              type="text"
              name="psc"
              placeholder="e.g. R425, D302"
              value={form.psc}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Posted From</label>
            <input
              className="input"
              type="date"
              name="postedFrom"
              value={form.postedFrom}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">Posted To</label>
            <input
              className="input"
              type="date"
              name="postedTo"
              value={form.postedTo}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">Set-Aside Type</label>
            <div className="relative">
              <select
                className="select pr-10"
                name="setAside"
                value={form.setAside}
                onChange={handleChange}
              >
                {SET_ASIDE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {expanded && (
            <div>
              <label className="label">Notice Type</label>
              <div className="relative">
                <select
                  className="select pr-10"
                  name="noticeType"
                  value={form.noticeType}
                  onChange={handleChange}
                >
                  {NOTICE_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Quick date filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-slate-400 font-medium">Quick:</span>
          <QuickFilter label="Last 7 days" onClick={() => applyQuickFilter(7)} />
          <QuickFilter label="Last 30 days" onClick={() => applyQuickFilter(30)} />
          <QuickFilter label="Last 60 days" onClick={() => applyQuickFilter(60)} />
          <QuickFilter label="Last 90 days" onClick={() => applyQuickFilter(90)} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching SAM.gov…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search SAM.gov
              </>
            )}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset Filters
          </button>
        </div>
      </form>
    </div>
  );
}
