import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../utils/api.js";
import { saveAuth } from "../utils/auth.js";

const NAICS_OPTIONS = [
  { code: "541330", label: "541330 – Engineering Services" },
  { code: "541511", label: "541511 – Custom Computer Programming" },
  { code: "541512", label: "541512 – Computer Systems Design" },
  { code: "541513", label: "541513 – Computer Facilities Management" },
  { code: "541519", label: "541519 – Other Computer-Related Services" },
  { code: "541611", label: "541611 – Management Consulting" },
  { code: "541690", label: "541690 – Other Scientific & Technical Consulting" },
  { code: "541990", label: "541990 – All Other Professional Services" },
  { code: "561110", label: "561110 – Office Administrative Services" },
  { code: "561210", label: "561210 – Facilities Support Services" },
  { code: "611430", label: "611430 – Professional & Management Training" },
  { code: "336411", label: "336411 – Aircraft Manufacturing" },
  { code: "332710", label: "332710 – Machine Shops" },
  { code: "238290", label: "238290 – Other Building Equipment Contractors" }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
    naicsCodes: [],
    rememberMe: false
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function handleNaicsToggle(code) {
    setForm((f) => ({
      ...f,
      naicsCodes: f.naicsCodes.includes(code)
        ? f.naicsCodes.filter((c) => c !== code)
        : [...f.naicsCodes, code]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await authApi.login({ email: form.email, password: form.password });
      } else {
        if (!form.name.trim()) { setError("Name is required."); return; }
        res = await authApi.register({
          email: form.email,
          password: form.password,
          name: form.name,
          company: form.company,
          naicsCodes: form.naicsCodes
        });
      }
      saveAuth(res.data, form.rememberMe);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Top Logo Bar */}
      <header className="flex items-center justify-between px-8 py-5">
        {/* BlackCrest Sourcing Group — top left */}
        <div className="flex items-center">
          <img
            src="/logos/blackcrest-logo.svg"
            alt="BlackCrest Sourcing Group"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* GovCon AI Scanner — top right */}
        <div className="flex items-center">
          <img
            src="/logos/govcon-logo.svg"
            alt="GovCon AI Scanner"
            className="h-12 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">GovCon AI Scanner</h1>
            <p className="text-slate-400 text-sm">
              Federal contracting intelligence powered by AI
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Tab switcher */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      className="input"
                      type="text"
                      name="name"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Company (optional)</label>
                    <input
                      className="input"
                      type="text"
                      name="company"
                      placeholder="BlackCrest Sourcing Group"
                      value={form.company}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="label">NAICS Codes (select all that apply)</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                    {NAICS_OPTIONS.map(({ code, label }) => (
                      <label key={code} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={form.naicsCodes.includes(code)}
                          onChange={() => handleNaicsToggle(code)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  {form.naicsCodes.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{form.naicsCodes.length} code(s) selected</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                {mode === "login" && (
                  <button type="button" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading
                  ? "Please wait…"
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6">
            Designed for Non-Classified Use Only &bull; GovCon AI Scanner v2.0
          </p>
        </div>
      </main>
    </div>
  );
}
