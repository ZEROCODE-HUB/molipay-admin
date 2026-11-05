import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { Check,Eye,EyeOff,KeyRound,Loader2,X } from "lucide-react";
import { MollyLogo } from "@/shared/ui/molly-logo";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { useAuth,useAuthActions } from "../auth.hooks";
import { createSetPasswordSchema } from "../auth.schema";
import { isPasswordValid,passwordRules } from "../password-policy";
import { usePermissions } from "@/features/rbac/rbac.hooks";

/**
 * Definir clave: destino de los links de invitacion y de reseteo (Supabase Auth
 * deja la sesion en la URL). Al guardar, un trigger sobre auth.users quita el
 * "cambio de clave pendiente" y el usuario recupera sus permisos.
 */

export function SetPasswordPage() {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const { session, refresh } = usePermissions();
  const [visible, setVisible] = useState(false);
  const { updatePassword } = useAuthActions();

  const email = user?.email ?? session?.email ?? null;
  const schema = useMemo(() => createSetPasswordSchema(email), [email]);
  const form = useZodForm(schema, { defaultValues: { password: "", confirmation: "" } });
  const { errors, isSubmitting } = form.formState;
  const password = form.watch("password");
  const confirmation = form.watch("confirmation");
  const rules = passwordRules(password, email);
  const canSubmit = isPasswordValid(password, email) && password === confirmation && !isSubmitting;

  const submit = form.handleSubmit(async ({ password: newPassword }) => {
    try {
      await updatePassword(newPassword);
    } catch (error) {
      applyServerErrors(form, error);
      return;
    }
    await refresh();
    navigate({ to: "/admin" });
  });

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
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  {...form.register("password")}
                  aria-invalid={!!errors.password}
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
                {...form.register("confirmation")}
                aria-invalid={!!errors.confirmation}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <FieldError
                message={confirmation.length > 0 ? errors.confirmation?.message : undefined}
              />
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

            {errors.root?.server?.message && (
              <p className="text-sm text-red-600">{errors.root.server.message}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Guardar y entrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
