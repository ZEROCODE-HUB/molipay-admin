import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getAdminUser } from "@/lib/api/admin-users";
import type { AdminUser } from "@/lib/api/types";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  /** Fila de admin_users del backoffice para el usuario autenticado (si existe). */
  admin: AdminUser | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    const load = async (s: Session | null) => {
      setSession(s);
      if (!s?.user) {
        setAdmin(null);
        setLoading(false);
        return;
      }
      try {
        const a = await getAdminUser(s.user.id);
        if (active) setAdmin(a);
      } catch {
        if (active) setAdmin(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void load(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ loading, session, user: session?.user ?? null, admin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
