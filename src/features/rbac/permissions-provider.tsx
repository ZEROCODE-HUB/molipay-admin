import { useCallback,useEffect,useMemo,useState,type ReactNode } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { rbacRepository } from "@/app/dependencies";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";
import { useAuth } from "@/features/auth/auth.hooks";
import type { PermissionCode } from "./permission-codes";
import { PermissionsContext,type PermissionsContextValue } from "./permissions-context";
import { createRbacQueries,rbacKeys } from "./rbac.queries";
import type { PermissionsStatus,SessionPermissions } from "./rbac.types";

/**
 * Permisos de la sesion del backoffice.
 *
 * - Fuente: RPC my_permissions() (la misma regla que aplica la base).
 * - Sin parpadeo: la ultima respuesta se guarda en localStorage junto con el
 *   usuario dueño y se usa al instante en el proximo render solo si coincide con
 *   la sesion; en paralelo se revalida (al montar, al volver a la pestaña y cada
 *   5 minutos). Si la version de permisos del rol cambio, la UI se actualiza sola.
 * - El cache solo afecta lo que se MUESTRA: la base vuelve a validar cada
 *   operacion (RLS / RPC / Edge Functions). Nunca autoriza nada.
 */

const REVALIDATE_MS = 5 * 60_000;
const rbacQueries = createRbacQueries(rbacRepository);

type CachedPermissions = { userId: string; data: SessionPermissions };

const permissionsCache = createKeyValueStore<CachedPermissions>({
  key: "molipay.permissions",
  version: 1,
  validate: (v): v is CachedPermissions =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as CachedPermissions).userId === "string" &&
    typeof (v as CachedPermissions).data === "object",
});

function writeCache(value: CachedPermissions | null) {
  if (value) permissionsCache.set(value);
  else permissionsCache.remove();
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // El servidor (SSR) no tiene localStorage: el cache se lee recien al montar,
  // asi el primer render del cliente coincide con el del servidor (sin error de
  // hidratacion) y en el render siguiente ya se muestra el panel.
  const [cached, setCached] = useState<CachedPermissions | null>(null);
  useEffect(() => setCached(permissionsCache.get()), []);

  // Mientras Auth restaura la sesion se usa el usuario del cache (render instantaneo).
  const userId = user?.id ?? (authLoading ? cached?.userId : undefined);
  const options = rbacQueries.myPermissions(userId ?? "");

  useEffect(() => {
    if (!userId || !cached || cached.userId !== userId) return;
    const key = rbacKeys.myPermissions(userId);
    if (queryClient.getQueryData(key) === undefined) {
      // updatedAt 0: el dato del cache se considera viejo y se revalida enseguida.
      queryClient.setQueryData(key, cached.data, { updatedAt: 0 });
    }
  }, [cached, userId, queryClient]);

  const query = useQuery({
    ...options,
    enabled: !!user,
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

  const session = (userId ? query.data : undefined) ?? null;
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
    if (userId) await queryClient.invalidateQueries({ queryKey: rbacKeys.myPermissions(userId) });
  }, [queryClient, userId]);

  let status: PermissionsStatus;
  if (userId && query.data !== undefined) status = query.data ? "ready" : "not_staff";
  else if (!authLoading && !user) status = "anonymous";
  else if (query.isError) status = "error";
  else status = "loading";

  const value = useMemo<PermissionsContextValue>(
    () => ({ status, session, has, hasAny, refresh }),
    [status, session, has, hasAny, refresh],
  );
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
