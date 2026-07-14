"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, ArrowRight, Hexagon } from "lucide-react";

// ---------------------------------------------------------------------------
// Login page — ReA3 cyberpunk dark aesthetic
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,77,77,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-25"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--accent) 60%, transparent 100%)",
        }}
      />

      {/* Main card */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        {/* Card border glow */}
        <div
          className="absolute -inset-[1px] rounded-2xl opacity-25 blur-[2px]"
          style={{
            background: "linear-gradient(135deg, rgba(255,77,77,0.25) 0%, transparent 40%, rgba(255,77,77,0.1) 100%)",
          }}
        />

        <div
          className="relative rounded-2xl border p-10"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-default)",
            boxShadow: "0 0 80px rgba(255,77,77,0.04), 0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Brand */}
          <div className="mb-10 text-center">
            {/* Icon */}
            <div className="relative mx-auto mb-5 inline-flex">
              <div
                className="absolute inset-0 rounded-2xl blur-md opacity-30"
                style={{ backgroundColor: "var(--accent)" }}
              />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor: "var(--accent-muted)",
                  borderColor: "rgba(255,77,77,0.2)",
                }}
              >
                <Hexagon className="h-8 w-8" style={{ color: "var(--accent)" }} />
              </div>
            </div>

            {/* Brand name */}
            <h1
              className="text-[2.25rem] font-black uppercase leading-none tracking-[0.15em]"
              style={{
                color: "var(--text-primary)",
                textShadow: "0 0 60px rgba(255,77,77,0.15)",
              }}
            >
              ReA3
            </h1>

            {/* Subtitle */}
            <div className="mt-2 flex items-center justify-center gap-3">
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, var(--accent))" }} />
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: "var(--accent)" }}
              >
                Asset Manager
              </p>
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }} />
            </div>

            {/* Divider */}
            <div className="mx-auto mt-8 max-w-[180px]">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
                <Shield className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border py-3 pl-10 pr-4 text-sm transition-all duration-200"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(255,77,77,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-default)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg border p-3 text-xs"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  borderColor: "rgba(239,68,68,0.2)",
                  color: "#ef4444",
                }}
              >
                <p className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-medium">Error</span>
                  <span className="opacity-80">{error}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="group relative w-full overflow-hidden rounded-lg py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent)";
              }}
            >
              {/* Hover shimmer */}
              <div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"
              />
              <span className="relative z-10 inline-flex items-center gap-2.5">
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer hint */}
          <p
            className="mt-8 text-center text-[11px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Set{" "}
            <code
              className="rounded px-1.5 py-0.5 text-[10px] font-mono"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              ADMIN_PASSWORD
            </code>{" "}
            in{" "}
            <code
              className="rounded px-1.5 py-0.5 text-[10px] font-mono"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              .env
            </code>{" "}
            to enable auth.
          </p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-15"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
