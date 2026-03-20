import React, { useState, useEffect } from "react";
import { suppliersApi } from "../utils/api.js";

const KPI_CATEGORIES = ["delivery", "quality", "cost", "responsiveness", "compliance"];

function ScoreRing({ score }) {
  const pct = score ?? 0;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="56" height="56" className="shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {pct}
      </text>
    </svg>
  );
}

function SupplierRow({ supplier, onSelect }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
      onClick={() => onSelect(supplier)}
    >
      <ScoreRing score={supplier.overallScore} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{supplier.name}</p>
        <p className="text-xs text-slate-500">
          {supplier.cage ? `CAGE: ${supplier.cage}` : supplier.dunsUei ? `UEI: ${supplier.dunsUei}` : "No ID"}
          {supplier.tier ? ` · ${supplier.tier.replace("_", " ")}` : ""}
        </p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
        supplier.status === "active" ? "bg-emerald-100 text-emerald-700"
        : supplier.status === "probation" ? "bg-amber-100 text-amber-700"
        : supplier.status === "blacklisted" ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-500"
      }`}>
        {supplier.status}
      </span>
    </div>
  );
}

function SupplierDetail({ supplier, onBack, onUpdate }) {
  const [kpis, setKpis] = useState(
    KPI_CATEGORIES.map((cat) => ({
      category: cat,
      score: supplier.kpis?.find((k) => k.category === cat)?.score ?? 0,
      notes: supplier.kpis?.find((k) => k.category === cat)?.notes ?? ""
    }))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await suppliersApi.update(supplier._id, { kpis });
      onUpdate(res.data.supplier);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">← Back to scorecards</button>
      <div className="flex items-center gap-4">
        <ScoreRing score={supplier.overallScore} />
        <div>
          <h2 className="text-lg font-bold text-slate-800">{supplier.name}</h2>
          <p className="text-sm text-slate-500">
            {supplier.cage && `CAGE: ${supplier.cage}`}
            {supplier.dunsUei && ` · UEI: ${supplier.dunsUei}`}
            {supplier.tier && ` · ${supplier.tier.replace("_", " ")}`}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">KPI Scores</h3>
        <div className="space-y-4">
          {kpis.map((kpi, i) => (
            <div key={kpi.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium capitalize text-slate-600">{kpi.category}</label>
                <span className={`text-sm font-bold ${
                  kpi.score >= 80 ? "text-emerald-600" : kpi.score >= 60 ? "text-blue-600"
                  : kpi.score >= 40 ? "text-amber-600" : "text-red-600"
                }`}>{kpi.score}</span>
              </div>
              <input
                type="range" min="0" max="100" value={kpi.score}
                onChange={(e) => setKpis((k) => k.map((item, idx) =>
                  idx === i ? { ...item, score: Number(e.target.value) } : item
                ))}
                className="w-full accent-blue-600"
              />
              <input
                value={kpi.notes}
                onChange={(e) => setKpis((k) => k.map((item, idx) =>
                  idx === i ? { ...item, notes: e.target.value } : item
                ))}
                placeholder="Notes…"
                className="input w-full text-xs"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving…" : "Save Scores"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplierScorecard() {
  const [suppliers, setSuppliers] = useState([]);
  const [scoreboard, setScoreboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", cage: "", tier: "sub" });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      suppliersApi.list({ search }),
      suppliersApi.scoreboard()
    ])
      .then(([listRes, sbRes]) => {
        setSuppliers(listRes.data.suppliers || []);
        setScoreboard(sbRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [search]);

  const handleAdd = async () => {
    if (!newSupplier.name.trim()) return;
    setAdding(true);
    try {
      const res = await suppliersApi.create(newSupplier);
      setSuppliers((s) => [res.data.supplier, ...s]);
      setNewSupplier({ name: "", cage: "", tier: "sub" });
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  if (selected) {
    return (
      <SupplierDetail
        supplier={selected}
        onBack={() => { setSelected(null); loadAll(); }}
        onUpdate={(updated) => {
          setSuppliers((s) => s.map((sup) => sup._id === updated._id ? updated : sup));
          setSelected(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Supplier Scorecards</h2>
          <p className="text-sm text-slate-500">Track and score supplier performance on key KPIs</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Supplier</button>
      </div>

      {scoreboard?.totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Suppliers", value: scoreboard.totals.total },
            { label: "Active", value: scoreboard.totals.active },
            { label: "On Probation", value: scoreboard.totals.probation },
            { label: "Avg Score", value: scoreboard.totals.avgScore != null ? Math.round(scoreboard.totals.avgScore) : "—" }
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Add Supplier</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Name *</label>
              <input value={newSupplier.name} onChange={(e) => setNewSupplier((s) => ({ ...s, name: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CAGE Code</label>
              <input value={newSupplier.cage} onChange={(e) => setNewSupplier((s) => ({ ...s, cage: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tier</label>
              <select value={newSupplier.tier} onChange={(e) => setNewSupplier((s) => ({ ...s, tier: e.target.value }))} className="input w-full">
                <option value="prime">Prime</option>
                <option value="sub">Sub</option>
                <option value="small_business">Small Business</option>
                <option value="socioeconomic">Socioeconomic</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm">
              {adding ? "Adding…" : "Add Supplier"}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          className="input flex-1 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
      ) : suppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-slate-500 text-sm">No suppliers yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <SupplierRow key={s._id} supplier={s} onSelect={setSelected} />
          ))}
        </div>
      )}
    </div>
  );
}
