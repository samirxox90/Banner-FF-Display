import { useState, useEffect } from "react";

const AUTH_KEY   = "ff_live_auth";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

export function getStoredAuth(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { expiry } = JSON.parse(raw) as { expiry: number };
    if (Date.now() > expiry) {
      localStorage.removeItem(AUTH_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ expiry: Date.now() + MAX_AGE_MS }));
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export { clearAuth };

interface Props {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: Props) {
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [remember,   setRemember]   = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState("");
  const [shaking,    setShaking]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Small artificial delay for feel
    setTimeout(() => {
      if (username.trim() === "login" && password === "2511") {
        if (remember) saveAuth();
        onSuccess();
      } else {
        setError("Invalid username or password.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
      setLoading(false);
    }, 350);
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-sm ${shaking ? "animate-shake" : ""}`}
        style={{ animation: shaking ? "shake 0.45s ease" : undefined }}
      >
        {/* Card */}
        <div className="bg-[#13161d] border border-white/8 rounded-2xl px-8 py-9 shadow-2xl">

          {/* Logo + title */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M19.5 5H13L10 13H14L11 21H13.5L23 11.5H18.5L21.5 5Z" fill="white" opacity="0.95" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white tracking-tight">FF Live Banners</h1>
              <p className="text-xs text-white/35 mt-0.5 tracking-wide">Sign in to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/45 uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter username"
                autoComplete="off"
                className="w-full bg-white/[0.05] border border-white/10 focus:border-orange-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none"
                style={{ transition: "border-color 120ms" }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/45 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  className="w-full bg-white/[0.05] border border-white/10 focus:border-orange-500/60 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none"
                  style={{ transition: "border-color 120ms" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 p-1"
                  style={{ transition: "color 100ms" }}
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <div
                onClick={() => setRemember((p) => !p)}
                className={`w-4 h-4 rounded flex items-center justify-center border ${
                  remember
                    ? "bg-orange-500 border-orange-500"
                    : "bg-white/5 border-white/15 group-hover:border-white/30"
                }`}
                style={{ transition: "background-color 100ms, border-color 100ms" }}
              >
                {remember && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-white/40 group-hover:text-white/60" style={{ transition: "color 100ms" }}>
                Remember me <span className="text-white/20">(1 day)</span>
              </span>
            </label>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400/80 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              style={{ transition: "background-color 100ms, opacity 100ms" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        {/* Subtle footer */}
        <p className="text-center text-[10px] text-white/15 mt-5 tracking-wide">
          FREE FIRE LIVE BANNERS — ASSET VIEWER
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(6px); }
          45%      { transform: translateX(-5px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
