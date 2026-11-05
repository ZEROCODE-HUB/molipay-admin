import { useQuery } from "@tanstack/react-query";
import {
listStatusesMovement,
listStatusesByKind,
} from "@/features/rbac/legacy-role-permissions.supabase";
import type { StatusMovement } from "@/infrastructure/supabase/legacy/types";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";

// Cache de sesión para catálogos estáticos, evita un round-trip en cada montaje.
const CACHE_KEY = "molipay:estados_movimiento";
const CACHE_TTL = 1000 * 60 * 60; // 1h

const statusesCache = createKeyValueStore<StatusMovement[]>({
  key: CACHE_KEY,
  storage: "session",
  ttlMs: CACHE_TTL,
  validate: (v): v is StatusMovement[] => Array.isArray(v),
});

/** Catálogo de estados de movimiento (cacheado en la sesión). */
export function useStatusesMovement() {
  return useQuery({
    queryKey: ["estados-movimiento"],
    queryFn: async () => {
      const cached = statusesCache.get();
      if (cached) return cached;
      const v = await listStatusesMovement();
      statusesCache.set(v);
      return v;
    },
    staleTime: CACHE_TTL,
  });
}

/** Estados válidos para un tipo de movimiento dado (tabla estados_por_tipo). */
export function useStatusesByKind(kind?: string) {
  return useQuery({
    queryKey: ["estados-por-tipo", kind ?? "all"],
    queryFn: () => listStatusesByKind(kind),
    staleTime: CACHE_TTL,
  });
}
