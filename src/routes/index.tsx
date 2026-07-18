import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck, Lock, Mail } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Administrator Portal — Molly Money Life" },
      { name: "description", content: "Admin panel for Molly Money Life platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setRole } = useDemoMode();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setRole("admin");
      navigate({ to: "/admin" });
    }, 600);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0A1628 0%, #111D35 40%, #162240 70%, #1A2747 100%)",
        color: "#F5F6F8",
      }}
    >
      {/* Full-screen frosted glass overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.12]"
        style={{
          background: "radial-gradient(circle, #0891B2 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-[0.08]"
        style={{
          background: "radial-gradient(circle, #C41E3A 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #0891B2 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(8,145,178,0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />

      {/* Data-flow SVG motif */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.12]"
        preserveAspectRatio="none"
        viewBox="0 0 500 900"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0" />
            <stop offset="50%" stopColor="#0891B2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="url(#lineGrad)" strokeWidth="0.8" fill="none">
          <path d="M80 0 L180 200 L140 380 L260 500 L220 700 L300 900" />
          <path d="M300 0 L360 150 L320 320 L420 480 L380 650 L450 900" />
          <path d="M450 0 L480 100 L440 250 L500 400" />
          <path d="M20 0 L60 300 L40 500 L120 700 L80 900" />
          <path d="M120 0 L160 180 L100 350 L200 550 L160 750 L250 900" />
        </g>
        <g fill="#0891B2" opacity="0.5">
          <circle cx="180" cy="200" r="2.5" />
          <circle cx="140" cy="380" r="2" />
          <circle cx="260" cy="500" r="2.5" />
          <circle cx="360" cy="150" r="2" />
          <circle cx="420" cy="480" r="2.5" />
          <circle cx="60" cy="300" r="2" />
          <circle cx="160" cy="180" r="2" />
        </g>
        {[120, 250, 400, 600, 780].map((y, i) => (
          <line
            key={i}
            x1="0" y1={y} x2="500" y2={y}
            stroke="#0891B2" strokeWidth="0.3" opacity={0.08 + i * 0.02}
          />
        ))}
      </svg>

      {/* Frosted glass content container */}
      <div
        className="relative z-10 w-full max-w-[440px] px-6 py-10"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="w-6 h-px bg-[#0891B2]/60" />
            <span
              className="uppercase tracking-[0.3em] text-[0.6rem] font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: "#0891B2" }}
            >
              Admin Console
            </span>
            <span className="w-6 h-px bg-[#0891B2]/60" />
          </div>
          <MollyLogo variant="light" size={40} />
          <h1
            className="mt-5 text-center leading-[1.12]"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              color: "#F5F6F8",
            }}
          >
            Administrator Portal
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "rgba(245,246,248,0.55)", fontFamily: "Inter, sans-serif" }}
          >
            Sign in to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block mb-1.5 text-xs font-semibold tracking-wide"
              style={{ color: "rgba(245,246,248,0.7)" }}
            >
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(245,246,248,0.3)" }} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@molipay.com"
                required
                autoComplete="email"
                className="w-full h-11 pl-10 pr-3.5 rounded-lg text-sm outline-none transition-all placeholder:text-white/25"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#F5F6F8",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(8,145,178,0.5)";
                  e.target.style.background = "rgba(255,255,255,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.background = "rgba(255,255,255,0.05)";
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1.5 text-xs font-semibold tracking-wide"
              style={{ color: "rgba(245,246,248,0.7)" }}
            >
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(245,246,248,0.3)" }} />
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-10 rounded-lg text-sm outline-none transition-all placeholder:text-white/25"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#F5F6F8",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(8,145,178,0.5)";
                  e.target.style.background = "rgba(255,255,255,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.background = "rgba(255,255,255,0.05)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "rgba(245,246,248,0.4)" }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #C41E3A 0%, #A00D26 100%)",
              color: "#fff",
              letterSpacing: "0.03em",
              boxShadow: "0 4px 15px rgba(196,30,58,0.3)",
            }}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5"
            style={{
              border: "1px solid rgba(8,145,178,0.2)",
              borderRadius: 4,
              background: "rgba(8,145,178,0.05)",
            }}
          >
            <ShieldCheck size={12} strokeWidth={1.5} color="#0891B2" />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#0891B2",
              }}
            >
              Registrado ante BCRA
            </span>
          </div>
          <p
            className="text-center text-[11px] leading-relaxed"
            style={{ color: "rgba(245,246,248,0.3)" }}
          >
            Authorized administrators only.
            <br />
            Molly Money Life &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
