import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../utils/api.js";
import { clearAuth, getUser } from "../utils/auth.js";

function UserAvatar({ user }) {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";
  return (
    <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-bold select-none">
      {initials}
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await authApi.logout();
    } catch {
      // best-effort
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="bg-navy-950 border-b border-white/10 px-6 py-0 flex items-center justify-between h-16 sticky top-0 z-50">
      {/* ── Left: Brand ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center shadow-sm shrink-0">
          <svg className="w-4 h-4 text-navy-950" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd"
              d="M10 1a9 9 0 100 18A9 9 0 0010 1zm-1 5a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 110-2.5A1.25 1.25 0 0110 14z"
              clipRule="evenodd" />
          </svg>
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-white font-bold text-sm tracking-tight">BlackCrest Sourcing</div>
          <div className="text-gold-400 text-[10px] font-semibold tracking-widest uppercase">GovCon AI Scanner</div>
        </div>
      </div>

      {/* ── Center: Nav links ── */}
      <nav className="hidden md:flex items-center gap-1">
        {[
          { label: "SAM.gov Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
          { label: "Bid Analysis", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "Compliance", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          { label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
        ].map(({ label, icon }) => (
          <button key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 text-xs font-medium transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Right: User menu ── */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/10 transition-all duration-150 focus:outline-none"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <UserAvatar user={user} />
            <div className="hidden md:block text-left leading-tight">
              <div className="text-white text-xs font-semibold truncate max-w-[120px]">
                {user?.name || "User"}
              </div>
              <div className="text-slate-400 text-[10px] truncate max-w-[120px]">
                {user?.email || ""}
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-500 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
                <span className="inline-block mt-1.5 badge badge-navy">Pro Plan</span>
              </div>
              {[
                { label: "Profile Settings", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { label: "API Keys", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
                { label: "Billing", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
                { label: "Help & Support", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }
              ].map(({ label, icon }) => (
                <button key={label}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
