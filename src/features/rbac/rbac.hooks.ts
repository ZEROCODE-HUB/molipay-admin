import { useCallback,useContext } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { rbacRepository } from "@/app/dependencies";
import { useAuth } from "@/features/auth/auth.hooks";
import { LEGACY_PERMISSION_MAP } from "./permission-codes";
import { PermissionsContext,type PermissionsContextValue } from "./permissions-context";
import { createRbacQueries,rbacKeys } from "./rbac.queries";
import type { LegacyAction,RoleInput } from "./rbac.types";

const rbacQueries = createRbacQueries(rbacRepository);

// ---------------------------------------------------------------------------
// Permisos de la sesion (solo para la UI: la base valida cada operacion)
// ---------------------------------------------------------------------------

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions debe usarse dentro de <PermissionsProvider>");
  return ctx;
}

/**
 * Chequeos de permisos para la UI.
 *  - has / hasAny: codigos nuevos (preferido).
 *  - can(accion, recurso): compatibilidad con el esquema viejo (via LEGACY_PERMISSION_MAP).
 */
export function useCan() {
  const { status, has, hasAny } = usePermissions();
  const can = useCallback(
    (action: LegacyAction, resource: string) => {
      const codes = LEGACY_PERMISSION_MAP[`${resource}:${action}`];
      return !!codes && hasAny(codes);
    },
    [hasAny],
  );
  return { can, has, hasAny, isLoading: status === "loading", isError: status === "error" };
}

// ---------------------------------------------------------------------------
// Roles y catalogo
// ---------------------------------------------------------------------------

/** Usuario de la sesion para las keys privadas; las consultas esperan a tenerlo. */
function useSessionUserId(): string {
  return useAuth().user?.id ?? "";
}

export function useRoles() {
  const userId = useSessionUserId();
  return useQuery({ ...rbacQueries.roles(userId), enabled: !!userId });
}

export function usePermissionCatalog() {
  const userId = useSessionUserId();
  return useQuery({ ...rbacQueries.catalog(userId), enabled: !!userId });
}

export function useRolePermissions(roleId: string | null, enabled = true) {
  const userId = useSessionUserId();
  return useQuery({
    ...rbacQueries.rolePermissions(userId, roleId ?? ""),
    enabled: !!userId && !!roleId && enabled,
  });
}

/** Escrituras sobre roles. Cada una deja la cache de RBAC lista para volver a consultarse. */
export function useRoleActions() {
  const userId = useSessionUserId();
  const queryClient = useQueryClient();

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: rbacKeys.all(userId) }),
    [queryClient, userId],
  );

  return {
    refresh,
    getRolePermissions: (roleId: string) => rbacRepository.listRolePermissions(roleId),
    saveRole: (input: RoleInput) => rbacRepository.saveRole(input),
    cloneRole: (roleId: string, name: string) => rbacRepository.cloneRole(roleId, name),
    deleteRole: (roleId: string, reassignTo: string | null) =>
      rbacRepository.deleteRole(roleId, reassignTo),
  };
}
