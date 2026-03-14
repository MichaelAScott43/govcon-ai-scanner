import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../utils/api.js";
import { clearAuth, getUser } from "../utils/auth.js";

export default function Header() {
  const navigate = useNavigate();
  const user = getUser();

  async function handleLogout() {
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
    <header className="border-b px-6 py-3 flex items-center justify-between" style={{ background: "#ffffff", borderColor: "rgba(20,36,58,0.12)", boxShadow: "0 2px 8px rgba(20,36,58,0.06)" }}>
      {/* Left: BlackCrest logo */}
      <div className="flex items-center">
        <img
          src="/logos/blackcrest-logo.svg"
          alt="BlackCrest Sourcing Group"
          className="h-9 w-auto object-contain"
        />
      </div>

      {/* Center: App title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#14243a" }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="font-semibold text-sm hidden sm:inline" style={{ color: "#14243a" }}>GovCon AI Scanner</span>
      </div>

      {/* Right: User info + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-xs hidden md:inline" style={{ color: "#5d6b7c" }}>
            {user.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm font-medium transition-colors text-slate-500 hover:text-slate-800"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
