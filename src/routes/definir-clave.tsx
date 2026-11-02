import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { supabase, getAuthErrorMessage } from "@/lib/supabase";
import { isPasswordValid, passwordRules } from "@/lib/password-policy";

/**
 * Definir clave: destino de los links de invitacion y de reseteo (Supabase Auth
 * deja la sesion en la URL). Al guardar, un trigger sobre auth.users quita el
 * "cambio de clave pendiente" y el usuario recupera sus permisos.
 */
export const Route = createFileRoute("/definir-clave")({
  head: () => ({
    meta: [
      { title: "Definí tu contraseña — Moli" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const { session, refresh } = usePermissions();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? session?.email ?? null;
  const rules = passwordRules(password, email);
  const matches = password.length > 0 && password === confirmation;
  const canSubmit = isPasswordValid(password, email) && matches && !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !supabase) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(getAuthErrorMessage(updateError.message));
      setSaving(false);
      return;
    }
    await refresh();
    navigate({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <MollyLogo />
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={20} />
          </div>
          <h1 className="font-display text-xl font-semibold">Definí tu contraseña</h1>
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>

        {authLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Verificando el link…
          </div>
        ) : !user ? (
          <div className="space-y-4 text-center text-sm">
            <p className="text-muted-foreground">
              El link venció o ya se usó. Pedile a un administrador que te reenvíe la invitación.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex h-10 items-center rounded-md border border-input px-4 font-medium hover:bg-accent"
            >
              Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold">
                Repetí la contraseña
              </label>
              <input
                id="confirm-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              {confirmation.length > 0 && !matches && (
                <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>
              )}
            </div>

            <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 ${rule.ok ? "text-emerald-700" : "text-muted-foreground"}`}
                >
                  {rule.ok ? <Check size={13} /> : <X size={13} />} {rule.label}
                </li>
              ))}
            </ul>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Guardar y entrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
