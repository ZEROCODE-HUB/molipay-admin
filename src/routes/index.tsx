import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-950 to-navy-800 opacity-[0.03] dark:opacity-[0.08]"
      />
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04] dark:opacity-[0.08]"
        style={{
          background: "radial-gradient(circle, var(--brand-red) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.03] dark:opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, var(--brand-blue) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative w-full max-w-[400px] px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border shadow-sm">
            <MollyLogo size={28} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Administrator Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block mb-1.5 text-xs font-semibold text-foreground/80">
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
              className="w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30 focus:border-ring"
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1.5 text-xs font-semibold text-foreground/80">
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
                className="w-full h-11 pl-3.5 pr-10 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30 focus:border-ring"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <LogIn size={16} />
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/60 leading-relaxed">
          Authorized administrators only.
          <br />
          Molly Money Life &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
