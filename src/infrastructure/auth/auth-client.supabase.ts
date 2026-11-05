import type { User } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";
import { AppError } from "@/shared/lib/errors";
import type { AuthClient,AuthUser } from "./auth-client";
import { getAuthErrorMessage } from "./auth-errors";

const toAuthUser = (user: User | null | undefined): AuthUser | null =>
  user ? { id: user.id, email: user.email ?? null } : null;

const NOT_CONFIGURED = "El inicio de sesión no está disponible en este momento.";

/** Error de Supabase Auth -> AppError con mensaje en español (sin el texto tecnico). */
function toAuthError(error: { message: string; status?: number }, operation: string): AppError {
  const kind = /network|fetch/i.test(error.message) ? "network" : "validation";
  return new AppError(kind, getAuthErrorMessage(error.message), {
    context: { feature: "auth", operation },
    cause: error,
  });
}

export function createSupabaseAuthClient(): AuthClient {
  return {
    async getCurrentUser() {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return toAuthUser(data.session?.user);
    },
    onUserChange(listener) {
      if (!supabase) return () => undefined;
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        listener(toAuthUser(session?.user)),
      );
      return () => data.subscription.unsubscribe();
    },
    async signInWithPassword(email, password) {
      if (!supabase)
        throw new AppError("unknown", NOT_CONFIGURED, { context: { feature: "auth" } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw toAuthError(error, "sign_in");
    },
    async updatePassword(newPassword) {
      if (!supabase)
        throw new AppError("unknown", NOT_CONFIGURED, { context: { feature: "auth" } });
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw toAuthError(error, "update_password");
    },
    async signOut(scope = "local") {
      if (!supabase) return;
      await supabase.auth.signOut({ scope });
    },
  };
}
