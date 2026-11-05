import { useContext } from "react";
import { authClient } from "@/app/dependencies";
import { AuthContext,type AuthContextValue } from "./auth-context";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Acciones de autenticacion (los errores llegan como AppError con mensaje en español). */
export function useAuthActions() {
  return {
    signIn: (email: string, password: string) => authClient.signInWithPassword(email, password),
    updatePassword: (newPassword: string) => authClient.updatePassword(newPassword),
  };
}
