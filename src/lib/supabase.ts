import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = supabase !== null;

const ERROR_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Usuario o contraseña incorrectos."],
  [/email not confirmed/i, "El correo aún no está confirmado. Revisá tu bandeja de entrada."],
  [/user not found/i, "No existe una cuenta con ese correo."],
  [
    /too many requests|rate limit/i,
    "Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.",
  ],
  [/invalid email/i, "Ingresá un correo electrónico válido."],
  [
    /network|fetch failed|failed to fetch/i,
    "No se pudo conectar. Verificá tu conexión e intentá de nuevo.",
  ],
];

export function getAuthErrorMessage(message: string): string {
  for (const [pattern, friendly] of ERROR_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }
  return "No se pudo iniciar sesión. Intentalo nuevamente.";
}
