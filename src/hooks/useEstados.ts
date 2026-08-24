import { useQuery } from "@tanstack/react-query";
import { listEstadosMovimiento, listEstadosPorTipo } from "@/lib/api/roles-permisos";
import type { EstadoMovimiento } from "@/lib/api/types";

// Cache de sesión para catálogos estáticos, evita un round-trip en cada montaje.
const CACHE_KEY = "molipay:estados_movimiento";
const CACHE_TTL = 1000 * 60 * 60; // 1h

function readCache(): EstadoMovimiento[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: EstadoMovimiento[] };
    if (Date.now() - parsed.t > CACHE_TTL) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache(v: EstadoMovimiento[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* sessionStorage no disponible */
  }
}

/** Catálogo de estados de movimiento (cacheado en la sesión). */
export function useEstadosMovimiento() {
  return useQuery({
    queryKey: ["estados-movimiento"],
    queryFn: async () => {
      const cached = readCache();
      if (cached) return cached;
      const v = await listEstadosMovimiento();
      writeCache(v);
      return v;
    },
    staleTime: CACHE_TTL,
  });
}

/** Estados válidos para un tipo de movimiento dado (tabla estados_por_tipo). */
export function useEstadosPorTipo(tipo?: string) {
  return useQuery({
    queryKey: ["estados-por-tipo", tipo ?? "all"],
    queryFn: () => listEstadosPorTipo(tipo),
    staleTime: CACHE_TTL,
  });
}
