import { useCallback,useEffect,useMemo,useState,type ReactNode } from "react";
import { authClient } from "@/app/dependencies";
import type { AuthUser } from "@/infrastructure/auth/auth-client";
import { AuthContext,type AuthContextValue } from "./auth-context";

/**
 * Sesion del backoffice (via AuthClient). Los datos del usuario del backoffice
 * (rol, permisos, cambio de clave pendiente) los resuelve PermissionsProvider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = authClient.onUserChange((next) => {
      if (!active) return;
      setUser(next);
      setLoading(false);
    });
    authClient
      .getCurrentUser()
      .then((current) => active && setUser(current))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ loading, user, signOut }),
    [loading, user, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
