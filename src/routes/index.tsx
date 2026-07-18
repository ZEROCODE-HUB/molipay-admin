import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
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
  const { setRole } = useDemoMode();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRole("admin");
    navigate({ to: "/admin" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0A1628 0%, #111D35 40%, #162240 70%, #1A2747 100%)",
        color: "#F5F6F8",
      }}
    >
      {/* Ambient glow orbs */}
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.08]"
        style={{
          background: "radial-gradient(circle, #0891B2 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, #C41E3A 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(8,145,178,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* Data-flow SVG motif */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.15]"
        preserveAspectRatio="none"
        viewBox="0 0 500 900"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0" />
            <stop offset="50%" stopColor="#0891B2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="url(#lineGrad)" strokeWidth="0.8" fill="none">
          <path d="M80 0 L180 200 L140 380 L260 500 L220 700 L300 900" />
          <path d="M300 0 L360 150 L320 320 L420 480 L380 650 L450 900" />
          <path d="M450 0 L480 100 L440 250 L500 400" />
          <path d="M20 0 L60 300 L40 500 L120 700 L80 900" />
        </g>
        <g fill="#0891B2" opacity="0.4">
          <circle cx="180" cy="200" r="2.5" />
          <circle cx="140" cy="380" r="2" />
          <circle cx="260" cy="500" r="2.5" />
          <circle cx="360" cy="150" r="2" />
          <circle cx="420" cy="480" r="2.5" />
          <circle cx="60" cy="300" r="2" />
        </g>
        {[120, 250, 400, 600, 780].map((y, i) => (
          <line
            key={i}
            x1="0" y1={y} x2="500" y2={y}
            stroke="#0891B2" strokeWidth="0.3" opacity={0.08 + i * 0.02}
          />
        ))}
      </svg>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px] px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="w-6 h-px bg-[#0891B2]/60" />
            <span
              className="uppercase tracking-[0.25em] text-[0.65rem]"
              style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: "#0891B2" }}
            >
              Admin Console
            </span>
            <span className="w-6 h-px bg-[#0891B2]/60" />
          </div>
          <MollyLogo variant="light" size={36} />
          <h1
            className="mt-6 text-center leading-[1.12]"
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

        <div
          className="rounded-xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block mb-1.5 text-xs font-semibold"
                style={{ color: "rgba(245,246,248,0.7)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@molipay.com"
                required
                autoComplete="email"
                className="w-full h-11 px-3.5 rounded-lg text-sm outline-none transition-all placeholder:text-white/30"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F5F6F8",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(8,145,178,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-1.5 text-xs font-semibold"
                style={{ color: "rgba(245,246,248,0.7)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 pl-3.5 pr-10 rounded-lg text-sm outline-none transition-all placeholder:text-white/30"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#F5F6F8",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(8,145,178,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(245,246,248,0.4)" }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "#C41E3A",
                color: "#fff",
                letterSpacing: "0.03em",
              }}
            >
              <LogIn size={16} />
              Sign In
            </button>
          </form>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5"
            style={{
              border: "1px solid rgba(8,145,178,0.25)",
              borderRadius: 4,
              background: "rgba(8,145,178,0.06)",
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
