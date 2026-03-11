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
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between shadow-lg">
      {/* Left: BlackCrest logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-base leading-none">B</span>
        </div>
        <div className="hidden sm:block">
          <div className="text-white font-bold text-xs leading-tight">BlackCrest</div>
          <div className="text-amber-400 text-xs leading-tight">Sourcing Group</div>
        </div>
      </div>

      {/* Center: App title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-sm hidden sm:inline">GovCon AI Scanner</span>
      </div>

      {/* Right: User info + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-slate-400 text-xs hidden md:inline">
            {user.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
