import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getPermisosByRol, listRecursos } from "@/lib/api/roles-permisos";
import type { Permiso } from "@/lib/api/types";

export type Accion = "leer" | "crear" | "modificar" | "borrar";

// Cache de sesión para recursos y la matriz de permisos del rol activo.
const REC_CACHE_KEY = "molipay:recursos";
const PERM_TTL = 1000 * 60 * 60; // 1h

type PermMap = Map<string, Permiso>;

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - parsed.t > PERM_TTL) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache(key: string, v: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* sessionStorage no disponible */
  }
}

async function getRecursosCached(): Promise<{ id: string; codigo: string }[]> {
  const cached = readCache<{ id: string; codigo: string }[]>(REC_CACHE_KEY);
  if (cached) return cached;
  const recs = await listRecursos();
  const slim = recs.map((r) => ({ id: r.id, codigo: r.codigo }));
  writeCache(REC_CACHE_KEY, slim);
  return slim;
}

/**
 * Matriz de permisos del rol del usuario logueado, indexada por
 * recurso.codigo. La ÚNICA fuente de verdad es la tabla `permisos`:
 * no se hace ningún atajo por nombre de rol.
 */
export function usePermisos() {
  const { admin } = useAuth();
  const rolId = admin?.rolId;
  return useQuery<PermMap>({
    queryKey: ["permisos-guard", rolId],
    enabled: !!rolId,
    queryFn: async () => {
      const recursos = await getRecursosCached();
      const recById = new Map(recursos.map((r) => [r.id, r.codigo]));
      const perms = await getPermisosByRol(rolId as string);
      const map: PermMap = new Map();
      for (const p of perms) {
        const codigo = recById.get(p.recursoId);
        if (codigo) map.set(codigo, p);
      }
      return map;
    },
    staleTime: PERM_TTL,
  });
}

/** Helper: ¿el rol activo puede `accion` sobre el `recurso` (código)? */
export function useCan() {
  const { data, isLoading, isError } = usePermisos();
  const can = (accion: Accion, codigo: string): boolean => {
    if (!data) return false;
    const p = data.get(codigo);
    if (!p) return false;
    if (accion === "leer") return p.puedeLeer;
    if (accion === "crear") return p.puedeCrear;
    if (accion === "modificar") return p.puedeModificar;
    return p.puedeBorrar;
  };
  return { can, isLoading, isError };
}
