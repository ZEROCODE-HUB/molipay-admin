import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-10 relative overflow-hidden">
      {/* Decorative brand element — soft blue glow */}
      <div aria-hidden className="absolute top-1/2 -translate-y-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: "radial-gradient(circle, #334596 0%, transparent 70%)" }}
      />
      <div aria-hidden className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: "radial-gradient(circle, #D21523 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-[400px] relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <MollyLogo size={44} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Panel de Administración
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Inicia sesión para continuar.
          </p>
        </div>

        {/* Card with top accent line */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-moli-red" />
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
                  placeholder="admin@Moli.com"
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

          <div className="mt-6 flex flex-col items-center gap-4 pt-4 border-t border-border">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
              <ShieldCheck size={12} className="text-moli-blue" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-moli-blue">
                Registrado ante BCRA
              </span>
            </div>
            <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
              Solo administradores autorizados.
              <br />
              Moli &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
