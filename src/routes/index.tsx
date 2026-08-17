import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Eye, EyeOff, Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";
import { supabase, isSupabaseConfigured, getAuthErrorMessage } from "@/lib/supabase";
import loginBackground from "@/assets/17.png";

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
  const [error, setError] = useState<string | null>(null);
  const { setRole } = useDemoMode();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError(
        "Supabase no está configurado. Verificá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local y reiniciá el servidor.",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(getAuthErrorMessage(error.message));
      setLoading(false);
      return;
    }
    setRole("admin");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden select-none">
      {/* Animated background image */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <img
          src={loginBackground}
          alt=""
          className="absolute inset-0 h-full w-full object-cover animate-kenburns"
        />
      </div>

      {/* Contrast overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(160deg, rgba(5,10,25,0.72) 0%, rgba(8,15,38,0.55) 45%, rgba(12,22,55,0.78) 100%), radial-gradient(ellipse at center, rgba(4,8,22,0.15) 0%, rgba(4,8,22,0.65) 100%)",
        }}
      />

      <div className="w-full max-w-[400px] relative">
        {/* Logo + title */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <MollyLogo size={44} variant="light" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Panel de Administración
          </h1>
          <p className="text-base text-white/50 mt-2">Inicia sesión para continuar.</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 shadow-[0_16px_48px_rgba(0,0,0,0.35)] relative overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
          }}
        >
          {/* Light reflection highlight */}
          <div
            aria-hidden
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
            }}
          />
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                />
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
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                />
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

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isSupabaseConfigured && (
              <p className="text-center text-[11px] text-muted-foreground">
                Login deshabilitado: Supabase no está configurado en este entorno.
              </p>
            )}

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

          <div className="mt-6 flex flex-col items-center gap-4 pt-4 border-t border-gray-100">
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
