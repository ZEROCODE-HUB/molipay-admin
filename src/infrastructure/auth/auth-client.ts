/**
 * Contrato de autenticacion: lo que la app necesita de la sesion, sin propagar
 * los tipos del proveedor. Hoy lo implementa Supabase Auth (auth-client.supabase.ts),
 * que sigue manejando tokens y renovacion: aca no se guardan tokens.
 *
 * Los errores llegan como AppError con el mensaje en español para el usuario.
 */

export type AuthUser = {
  id: string;
  email: string | null;
};

export interface AuthClient {
  /** Usuario de la sesion guardada (null si no hay). */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Avisa cada cambio de sesion (login, logout, otro usuario). Devuelve la funcion para desuscribirse. */
  onUserChange(listener: (user: AuthUser | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  /** Cambia la clave del usuario de la sesion (invitacion, reseteo o cambio voluntario). */
  updatePassword(newPassword: string): Promise<void>;
  signOut(scope?: "local" | "others" | "global"): Promise<void>;
}
