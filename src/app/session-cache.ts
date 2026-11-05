import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";

/**
 * Vacia la cache de TanStack Query cuando termina la sesion o entra otro
 * usuario en la misma pestaña: ningun dato de la sesion anterior queda visible.
 * Solo en el navegador (en SSR no hay sesion).
 */
let unsubscribe: (() => void) | null = null;

export function bindQueryCacheToSession(queryClient: QueryClient) {
  if (typeof window === "undefined" || !supabase) return;
  unsubscribe?.();
  let currentUserId: string | null | undefined;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const nextUserId = session?.user.id ?? null;
    const userChanged = currentUserId !== undefined && nextUserId !== currentUserId;
    if (event === "SIGNED_OUT" || userChanged) queryClient.clear();
    currentUserId = nextUserId;
  });
  unsubscribe = () => data.subscription.unsubscribe();
}
