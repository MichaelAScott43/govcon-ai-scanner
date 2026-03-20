import React, { useState, useEffect } from "react";
import { erpApi } from "../utils/api.js";

const ERP_SYSTEMS = [
  { id: "infor_syteline", label: "Infor SyteLine" },
  { id: "oracle", label: "Oracle ERP Cloud" },
  { id: "sap", label: "SAP S/4HANA" }
];

function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
      status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
    }`}>
      {status === "ok" ? "Connected" : "Error"}
    </span>
  );
}

function AddErpForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    system: "infor_syteline", label: "", tenantUrl: "",
    tokenUrl: "", clientId: "", clientSecret: "", scope: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await erpApi.create(form);
      onAdd(res.data.config);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add ERP connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <h3 className="font-semibold text-slate-800">Add ERP Connection</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">ERP System *</label>
          <select value={form.system} onChange={set("system")} className="input w-full">
            {ERP_SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input value={form.label} onChange={set("label")} placeholder="e.g. Production" className="input w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Tenant URL *</label>
          <input value={form.tenantUrl} onChange={set("tenantUrl")} required placeholder="https://your-tenant.example.com" className="input w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">OAuth 2.0 Token URL</label>
          <input value={form.tokenUrl} onChange={set("tokenUrl")} placeholder="https://auth.example.com/token" className="input w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Client ID *</label>
          <input value={form.clientId} onChange={set("clientId")} required className="input w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Client Secret *</label>
          <input type="password" value={form.clientSecret} onChange={set("clientSecret")} required className="input w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scope (optional)</label>
          <input value={form.scope} onChange={set("scope")} className="input w-full" />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving…" : "Save Connection"}
        </button>
      </div>
    </form>
  );
}

function ErpCard({ config, onDelete, onTest }) {
  const sysLabel = ERP_SYSTEMS.find((s) => s.id === config.system)?.label ?? config.system;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{config.label || sysLabel}</p>
          <p className="text-xs text-slate-500">{sysLabel} · {config.tenantUrl}</p>
        </div>
        <StatusBadge status={config.lastTestStatus} />
      </div>
      {config.lastTestMessage && (
        <p className="text-xs text-slate-500 italic">{config.lastTestMessage}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onTest(config.id)} className="btn-secondary text-xs px-3 py-1.5">
          Test Connection
        </button>
        <button onClick={() => onDelete(config.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ErpConnector() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    erpApi.list()
      .then((res) => setConfigs(res.data.configs || []))
      .catch(() => setError("Failed to load ERP configurations."))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = (config) => {
    setConfigs((c) => [config, ...c]);
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    try {
      await erpApi.remove(id);
      setConfigs((c) => c.filter((cfg) => cfg.id !== id));
    } catch {
      setError("Failed to remove ERP configuration.");
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      const res = await erpApi.test(id);
      setConfigs((c) =>
        c.map((cfg) =>
          cfg.id === id
            ? { ...cfg, lastTestStatus: "ok", lastTestMessage: res.data.message }
            : cfg
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || "Connection test failed.";
      setConfigs((c) =>
        c.map((cfg) =>
          cfg.id === id ? { ...cfg, lastTestStatus: "error", lastTestMessage: msg } : cfg
        )
      );
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">ERP Connections</h2>
          <p className="text-sm text-slate-500">Connect Infor SyteLine, Oracle ERP, or SAP via OAuth 2.0</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          + Add Connection
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {testingId && <p className="text-sm text-blue-600">Testing connection…</p>}

      {showAdd && (
        <AddErpForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
      ) : configs.length === 0 && !showAdd ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-slate-500 text-sm">No ERP connections configured yet.</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 btn-secondary text-sm">
            Add your first connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {configs.map((cfg) => (
            <ErpCard key={cfg.id} config={cfg} onDelete={handleDelete} onTest={handleTest} />
          ))}
        </div>
      )}
    </div>
  );
}
