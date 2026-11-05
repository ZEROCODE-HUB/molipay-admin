import { createContext } from "react";
import type { AuthUser } from "@/infrastructure/auth/auth-client";

export type AuthContextValue = {
  /** true mientras se restaura la sesion guardada. */
  loading: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
