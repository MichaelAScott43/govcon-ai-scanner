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
const FEATURES = [
  { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", text: "Real-time SAM.gov opportunity search" },
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "AI-powered bid/no-bid scoring" },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", text: "FAR/DFARS compliance review" },
  { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", text: "Daily opportunity digest emails" }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
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
        if (!form.name.trim()) {
          setError("Full name is required.");
          setLoading(false);
          return;
        }
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg leading-none">B</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">BlackCrest</div>
            <div className="text-amber-400 text-xs leading-tight">Sourcing Group</div>
          </div>
        </div>

        {/* GovCon AI Scanner — top right */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-white font-bold text-sm leading-tight text-right">GovCon AI</div>
            <div className="text-blue-400 text-xs leading-tight text-right">Scanner</div>
          </div>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

    <div className="min-h-screen flex" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Left panel (branding) ── */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-gradient-to-b from-navy-950 to-navy-800 px-12 py-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-16 translate-y-16" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-16 relative">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-navy-950" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a9 9 0 100 18A9 9 0 0010 1zm-1 5a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 110-2.5A1.25 1.25 0 0110 14z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">BlackCrest Sourcing Group</div>
            <div className="text-gold-400 text-xs tracking-widest uppercase">GovCon AI Scanner</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative flex-1">
          <h2 className="text-white text-3xl font-bold leading-tight mb-4">
            Win more federal<br />contracts with AI.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Find, evaluate, and prioritize federal contracting opportunities in minutes — not hours. Built for GovCon professionals who demand results.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative mt-12 pt-8 border-t border-navy-700">
          <div className="flex items-center gap-3 mb-2">
            {["A", "B", "C"].map((l) => (
              <div key={l} className="w-8 h-8 rounded-full bg-navy-600 border-2 border-navy-800 flex items-center justify-center text-xs text-white font-bold">
                {l}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs">
            Trusted by 500+ GovCon professionals &bull; SAM.gov certified integration
          </p>
    <div className="min-h-screen flex flex-col" style={{ background: "#f7fafe" }}>
      {/* Top Logo Bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "rgba(20,36,58,0.10)", background: "#ffffff" }}>
        {/* BlackCrest Sourcing Group — top left */}
        <div className="flex items-center">
          <img
            src="/logos/blackcrest-logo.svg"
            alt="BlackCrest Sourcing Group"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* GovCon AI Scanner — top right */}
        <div className="flex items-center">
          <img
            src="/logos/govcon-logo.svg"
            alt="GovCon AI Scanner"
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center justify-center gap-3 py-6 bg-navy-950">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-navy-950" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a9 9 0 100 18A9 9 0 0010 1zm-1 5a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 110-2.5A1.25 1.25 0 0110 14z" clipRule="evenodd" />
            </svg>
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
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#14243a" }}>GovCon AI Scanner</h1>
            <p className="text-sm" style={{ color: "#5d6b7c" }}>
              Federal contracting intelligence powered by AI
            </p>
          </div>
          <div>
            <div className="text-white font-bold text-sm">GovCon AI Scanner</div>
            <div className="text-gold-400 text-[10px] tracking-widest uppercase">BlackCrest Sourcing Group</div>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {mode === "login"
                  ? "Sign in to access your GovCon dashboard"
                  : "Start your 14-day free trial — no credit card required"}
              </p>
          {/* Card */}
          <div className="bg-white rounded-2xl p-8" style={{ border: "1px solid rgba(20,36,58,0.12)", boxShadow: "0 10px 28px rgba(20,36,58,0.08)" }}>
            {/* Tab switcher */}
            <div className="flex rounded-lg p-1 mb-6" style={{ background: "#edf3fb" }}>
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                    ? "bg-white shadow-sm"
                    : ""
                }`}
                style={mode === "login" ? { color: "#14243a" } : { color: "#5d6b7c" }}
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
                    ? "bg-white shadow-sm"
                    : ""
                }`}
                style={mode === "register" ? { color: "#14243a" } : { color: "#5d6b7c" }}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {/* Mode toggle */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 mb-6">
              {[{ id: "login", label: "Sign In" }, { id: "register", label: "Create Account" }].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMode(id); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    mode === id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Register-only fields */}
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 placeholder-slate-400 transition-all"
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Company Name
                    </label>
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 placeholder-slate-400 transition-all"
                      type="text"
                      name="company"
                      placeholder="Acme Federal Solutions LLC"
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
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Work Email
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 placeholder-slate-400 transition-all"
                    type="email"
                    name="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 placeholder-slate-400 transition-all"
                    type="password"
                    name="password"
                    placeholder={mode === "register" ? "Min. 8 characters" : "••••••••"}
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
              </div>

              {/* NAICS codes (register only) */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Your NAICS Codes <span className="normal-case font-normal text-slate-400">(optional — improves search results)</span>
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1 rounded-xl border border-slate-200 bg-white p-3">
                  <label className="label">NAICS Codes (select all that apply)</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg p-2 space-y-1" style={{ border: "1px solid #c8d5e6" }}>
                    {NAICS_OPTIONS.map(({ code, label }) => (
                      <label
                        key={code}
                        className={`flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg transition-colors text-xs ${
                          form.naicsCodes.includes(code)
                            ? "bg-navy-50 text-navy-800"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.naicsCodes.includes(code)}
                          onChange={() => handleNaicsToggle(code)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                          className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                          className="rounded"
                          style={{ borderColor: "#c8d5e6", accentColor: "#14243a" }}
                        />
                        <span className="text-sm" style={{ color: "#14243a" }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  {form.naicsCodes.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{form.naicsCodes.length} code(s) selected</p>
                    <p className="text-xs mt-1" style={{ color: "#9a7724" }}>{form.naicsCodes.length} code(s) selected</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
              {/* Remember me / Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
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
                    className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                    className="rounded"
                    style={{ borderColor: "#c8d5e6", accentColor: "#14243a" }}
                  />
                  <span className="text-sm" style={{ color: "#5d6b7c" }}>Remember me</span>
                </label>
                {mode === "login" && (
                  <button type="button" className="text-sm text-navy-600 hover:text-navy-800 font-medium transition-colors">
                  <button type="button" className="text-sm font-medium" style={{ color: "#9a7724", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
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
              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-navy-600 hover:bg-navy-700 active:bg-navy-800 text-white font-semibold text-sm py-3 px-6 rounded-xl shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "login" ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    {mode === "login" ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In to Dashboard
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Start Free Trial
                      </>
                    )}
                  </>
                )}
              </button>
            </form>

            {/* Pricing note (register) */}
            {mode === "register" && (
              <p className="text-center text-xs text-slate-400 mt-4">
                After trial: $79/month &bull; Cancel anytime &bull; No credit card required to start
              </p>
            )}

            {/* Security note */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit encryption
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Non-classified use only
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                SOC 2 ready
              </span>
            </div>
          </div>
          <p className="text-center text-xs mt-6" style={{ color: "#5d6b7c" }}>
            Designed for Non-Classified Use Only &bull; GovCon AI Scanner v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
