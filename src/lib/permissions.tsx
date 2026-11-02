import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchMyPermissions, type SessionPermissions } from "@/lib/api/rbac";
import { LEGACY_PERMISSION_MAP, type PermissionCode } from "@/lib/permission-codes";

/**
 * Permisos de la sesion del backoffice.
 *
 * - Fuente: RPC my_permissions() (la misma regla que aplica la base).
 * - Sin parpadeo: la ultima respuesta se guarda en localStorage por usuario y
 *   se usa al instante en el proximo render; en paralelo se revalida (al montar,
 *   al volver a la pestaña y cada 5 minutos). Si la version de permisos del rol
 *   cambio, la UI se actualiza sola.
 * - El cache solo afecta lo que se MUESTRA: la base vuelve a validar cada
 *   operacion (RLS / RPC / Edge Functions).
 */

const CACHE_KEY = "molipay.permissions.v1";
const REVALIDATE_MS = 5 * 60_000;

type CachedPermissions = { userId: string; data: SessionPermissions };

function readCache(): CachedPermissions | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedPermissions) : null;
  } catch {
    return null;
  }
}

function writeCache(value: CachedPermissions | null) {
  try {
    if (value) localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* almacenamiento no disponible: se sigue sin cache */
  }
}

export type PermissionsStatus =
  /** Todavia no hay datos (primer ingreso sin cache). */
  | "loading"
  /** Hay permisos (aunque se esten revalidando). */
  | "ready"
  /** Sin sesion. */
  | "anonymous"
  /** Sesion valida pero no es usuario del backoffice. */
  | "not_staff"
  | "error";

type PermissionsContextValue = {
  status: PermissionsStatus;
  session: SessionPermissions | null;
  has: (code: PermissionCode) => boolean;
  hasAny: (codes: readonly PermissionCode[]) => boolean;
  refresh: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export const MY_PERMISSIONS_QUERY_KEY = "my-permissions";

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // El servidor (SSR) no tiene localStorage: el cache se lee recien al montar,
  // asi el primer render del cliente coincide con el del servidor (sin error de
  // hidratacion) y en el render siguiente ya se muestra el panel.
  const [cached, setCached] = useState<CachedPermissions | null>(null);
  useEffect(() => setCached(readCache()), []);

  // Mientras Auth restaura la sesion se usa el usuario del cache (render instantaneo).
  const userId = user?.id ?? (authLoading ? cached?.userId : undefined);
  const queryKey = useMemo(() => [MY_PERMISSIONS_QUERY_KEY, userId] as const, [userId]);

  useEffect(() => {
    if (cached && cached.userId === userId && queryClient.getQueryData(queryKey) === undefined) {
      // updatedAt 0: el dato del cache se considera viejo y se revalida enseguida.
      queryClient.setQueryData(queryKey, cached.data, { updatedAt: 0 });
    }
  }, [cached, userId, queryKey, queryClient]);

  const query = useQuery({
    queryKey,
    queryFn: fetchMyPermissions,
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: REVALIDATE_MS,
    retry: 1,
  });

  useEffect(() => {
    if (user && query.isSuccess)
      writeCache(query.data ? { userId: user.id, data: query.data } : null);
  }, [user, query.isSuccess, query.data]);

  useEffect(() => {
    if (!authLoading && !user) writeCache(null);
  }, [authLoading, user]);

  const session = query.data ?? null;
  const codes = useMemo(() => new Set<string>(session?.codes ?? []), [session]);

  const has = useCallback(
    (code: PermissionCode) =>
      !!session &&
      session.isActive &&
      !session.mustChangePassword &&
      (session.isSuperadmin || codes.has(code)),
    [session, codes],
  );
  const hasAny = useCallback((list: readonly PermissionCode[]) => list.some(has), [has]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [MY_PERMISSIONS_QUERY_KEY] });
  }, [queryClient]);

  let status: PermissionsStatus;
  if (query.data !== undefined) status = query.data ? "ready" : "not_staff";
  else if (!authLoading && !user) status = "anonymous";
  else if (query.isError) status = "error";
  else status = "loading";

  const value = useMemo<PermissionsContextValue>(
    () => ({ status, session, has, hasAny, refresh }),
    [status, session, has, hasAny, refresh],
  );
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions debe usarse dentro de <PermissionsProvider>");
  return ctx;
}

/** Accion del esquema viejo (recurso + accion). */
export type Accion = "leer" | "crear" | "modificar" | "borrar";

/**
 * Chequeos de permisos para la UI.
 *  - has / hasAny: codigos nuevos (preferido).
 *  - can(accion, recurso): compatibilidad con el esquema viejo (via LEGACY_PERMISSION_MAP).
 */
export function useCan() {
  const { status, has, hasAny } = usePermissions();
  const can = useCallback(
    (action: Accion, resource: string) => {
      const codes = LEGACY_PERMISSION_MAP[`${resource}:${action}`];
      return !!codes && hasAny(codes);
    },
    [hasAny],
  );
  return { can, has, hasAny, isLoading: status === "loading", isError: status === "error" };
}

/** Muestra children solo si hay permiso (oculta botones, opciones, pestañas). */
export function Can({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: PermissionCode;
  anyOf?: readonly PermissionCode[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { has, hasAny } = usePermissions();
  const allowed = permission ? has(permission) : anyOf ? hasAny(anyOf) : false;
  return <>{allowed ? children : fallback}</>;
}
