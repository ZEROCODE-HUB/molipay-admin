import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";
import logoSrc from "@/assets/molly-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel de Administración — Moli" },
      { name: "description", content: "Panel de administración de la plataforma Moli." },
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
    <div className="min-h-screen grid lg:grid-cols-2 overflow-x-hidden">
      {/* Left panel — brand dark */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-12 overflow-hidden select-none"
        style={{
          background: "linear-gradient(160deg, #1A244D 0%, #25336B 40%, #2B3D7A 100%)",
        }}
      >
        {/* Subtle grid pattern */}
        <div aria-hidden className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Decorative orbs */}
        <div aria-hidden className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: "radial-gradient(circle, #D21523 0%, transparent 70%)" }}
        />
        <div aria-hidden className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.05] pointer-events-none"
          style={{ background: "radial-gradient(circle, #9CB0D9 0%, transparent 70%)" }}
        />

        <div className="relative z-10">
          <div className="inline-flex">
            <img src={logoSrc} alt="Moli" style={{ height: 34, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
          </div>
          <div className="mt-16">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-6 h-px bg-red-400/60" />
              <span className="text-[0.65rem] tracking-[0.25em] uppercase font-semibold text-red-400/80">
                Moli · Administración
              </span>
            </div>
            <h2 className="text-[clamp(1.5rem,2vw,2rem)] font-light leading-[1.12] tracking-tight max-w-[20ch] text-white">
              Gestión centralizada de tu plataforma
            </h2>
            <p className="mt-5 max-w-[36ch] text-white/60 leading-relaxed text-sm">
              Monitoreá usuarios, movimientos y alertas desde un solo panel. Todo bajo los estándares de seguridad del sistema financiero.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2.5 px-3 py-2 border border-red-400/30 rounded-md bg-red-500/5 backdrop-blur">
            <ShieldCheck size={13} strokeWidth={1.5} className="text-red-400" />
            <span className="text-[0.65rem] tracking-[0.1em] uppercase font-semibold text-red-400">
              Registrado ante BCRA
            </span>
          </div>
          <p className="text-white/30 text-[11px]">© {new Date().getFullYear()} Moli</p>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="flex flex-col bg-white">
        {/* Mobile header */}
        <div className="lg:hidden px-6 py-4 flex items-center border-b border-gray-100">
          <MollyLogo size={28} />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 lg:py-16">
          <div className="w-full max-w-[400px]">
            <div className="text-center lg:text-left mb-10">
              <h1 className="text-xl font-semibold text-foreground">
                Iniciar sesión
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Ingresá tus credenciales para acceder al panel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@moli.com"
                    required
                    autoComplete="email"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-foreground mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    required
                    autoComplete="current-password"
                    className="w-full h-11 pl-9 pr-10 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition cursor-pointer"
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 hover:bg-moli-red-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={16} />
                    Iniciar sesión
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-3 pt-6 border-t border-gray-100">
              <div className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
                <ShieldCheck size={12} className="text-moli-blue" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-moli-blue">
                  Registrado ante BCRA
                </span>
              </div>
              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                Solo administradores autorizados.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
