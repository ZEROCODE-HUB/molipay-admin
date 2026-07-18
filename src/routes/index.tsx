import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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

function ParticleCanvas() {
  useEffect(() => {
    const canvas = document.getElementById("particle-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let anim: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        a: Math.random() * 0.3 + 0.05,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(8, 145, 178, ${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(8, 145, 178, ${0.04 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      anim = requestAnimationFrame(draw);
    };
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    draw();
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas id="particle-canvas" className="absolute inset-0 pointer-events-none z-[1]" />;
}

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
      {/* Grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(8,145,178,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Gradient orbs */}
      <div
        aria-hidden
        className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full z-0"
        style={{
          background: "radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full z-0"
        style={{
          background: "radial-gradient(circle, rgba(196,30,58,0.1) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full z-0"
        style={{
          background: "radial-gradient(circle, rgba(8,145,178,0.06) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      {/* Particles */}
      <ParticleCanvas />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[420px] px-4 py-8">
        <div
          className="relative rounded-2xl p-8 md:p-10 overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(32px) saturate(1.5)",
            WebkitBackdropFilter: "blur(32px) saturate(1.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.02)",
          }}
        >
          {/* Animated gradient border */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              padding: "1px",
              background:
                "linear-gradient(135deg, rgba(8,145,178,0.3), rgba(8,145,178,0.05), rgba(196,30,58,0.1), rgba(8,145,178,0.3))",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Logo + title */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="w-6 h-px bg-cyan-500/40" />
              <span
                className="uppercase tracking-[0.3em] text-[0.6rem] font-semibold text-cyan-400"
                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              >
                Admin Console
              </span>
              <span className="w-6 h-px bg-cyan-500/40" />
            </div>
            <MollyLogo variant="light" size={42} />
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
            <p className="mt-2 text-sm" style={{ color: "rgba(245,246,248,0.5)" }}>
              Sign in to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="group">
              <label
                htmlFor="email"
                className="block mb-1.5 text-xs font-semibold tracking-wide"
                style={{ color: "rgba(245,246,248,0.6)" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(245,246,248,0.25)" }}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@molipay.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm outline-none transition-all duration-300 placeholder:text-white/20"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#F5F6F8",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(8,145,178,0.4)";
                    e.target.style.background = "rgba(255,255,255,0.07)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(8,145,178,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.06)";
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="password"
                className="block mb-1.5 text-xs font-semibold tracking-wide"
                style={{ color: "rgba(245,246,248,0.6)" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(245,246,248,0.25)" }}
                />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl text-sm outline-none transition-all duration-300 placeholder:text-white/20"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#F5F6F8",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(8,145,178,0.4)";
                    e.target.style.background = "rgba(255,255,255,0.07)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(8,145,178,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.06)";
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                  style={{ color: "rgba(245,246,248,0.35)" }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 relative overflow-hidden group/btn"
              style={{
                background: "linear-gradient(135deg, #C41E3A 0%, #A00D26 100%)",
                color: "#fff",
                letterSpacing: "0.03em",
                boxShadow: "0 4px 20px rgba(196,30,58,0.3)",
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
                }}
              />
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
                border: "1px solid rgba(8,145,178,0.15)",
                borderRadius: 6,
                background: "rgba(8,145,178,0.04)",
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
              style={{ color: "rgba(245,246,248,0.25)" }}
            >
              Authorized administrators only.
              <br />
              Molly Money Life &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
