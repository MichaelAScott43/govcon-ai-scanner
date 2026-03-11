import React, { useState } from "react";
import { opportunitiesApi } from "../utils/api.js";

const SET_ASIDE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "SBA", label: "Small Business" },
  { value: "8A", label: "8(a)" },
  { value: "HZC", label: "HUBZone" },
  { value: "SDVOSBC", label: "SDVOSB" },
  { value: "WOSB", label: "WOSB" },
  { value: "EDWOSB", label: "EDWOSB" }
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export default function SearchForm({ onResults }) {
  const [form, setForm] = useState({
    keyword: "",
    naics: "",
    psc: "",
    setAside: "",
    postedFrom: daysAgoStr(30),
    postedTo: todayStr()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await opportunitiesApi.search(form);
      onResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Search failed. Please try again.");
      onResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">SAM.gov Opportunity Search</h2>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Keyword</label>
            <input
              className="input"
              type="text"
              name="keyword"
              placeholder="cybersecurity, logistics…"
              value={form.keyword}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">NAICS Code</label>
            <input
              className="input"
              type="text"
              name="naics"
              placeholder="541512"
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
              placeholder="R425"
              value={form.psc}
              onChange={handleChange}
            />
          </div>
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
            <label className="label">Set-Aside</label>
            <select
              className="input"
              name="setAside"
              value={form.setAside}
              onChange={handleChange}
            >
              {SET_ASIDE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Searching…
            </span>
          ) : (
            "Search SAM.gov"
          )}
        </button>
      </form>
    </div>
  );
}
