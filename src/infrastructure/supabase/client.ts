import { createClient,type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = supabase !== null;

/**
 * Devuelve el cliente de Supabase o lanza un error claro si no está configurado.
 * Usar esto en las capas de acceso a datos para no operar contra `null` en silencio.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno.",
    );
  }
  return supabase;
}
