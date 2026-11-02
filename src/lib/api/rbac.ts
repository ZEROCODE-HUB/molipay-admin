import { requireSupabase } from "@/lib/supabase";
import type { PermissionCode } from "@/lib/permission-codes";
import { DataAccessError } from "./errors";

/**
 * Roles y permisos del backoffice (migracion 20261104100000_rbac_model).
 *
 * - El catalogo (permission_modules / permissions) es de solo lectura.
 * - Los cambios van por RPC (role_save, role_clone, role_delete): la base valida
 *   el permiso backoffice.roles.manage y audita.
 */

// ============================================================================
// Sesion
// ============================================================================

export type SessionPermissions = {
  userId: string;
  fullName: string;
  email: string;
  staffCode: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  isSuperadmin: boolean;
  mustChangePassword: boolean;
  version: number;
  codes: PermissionCode[];
};

type MyPermissionsResponse = {
  user: { id: string; full_name: string; email: string; staff_code: string; is_active: boolean };
  role: { id: string; name: string; is_superadmin: boolean };
  must_change_password: boolean;
  permissions_version: number;
  permissions: PermissionCode[];
} | null;

/** Permisos de la sesion actual (null si no es usuario del backoffice). */
export async function fetchMyPermissions(): Promise<SessionPermissions | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("my_permissions");
  if (error) throw new DataAccessError(error);
  const r = data as MyPermissionsResponse;
  if (!r) return null;
  return {
    userId: r.user.id,
    fullName: r.user.full_name,
    email: r.user.email,
    staffCode: r.user.staff_code,
    isActive: r.user.is_active,
    roleId: r.role.id,
    roleName: r.role.name,
    isSuperadmin: r.role.is_superadmin,
    mustChangePassword: r.must_change_password,
    version: r.permissions_version,
    codes: r.permissions ?? [],
  };
}

// ============================================================================
// Catalogo
// ============================================================================

export type PermissionDefinition = {
  code: PermissionCode;
  moduleCode: string;
  name: string;
  description: string | null;
  isSensitive: boolean;
};

export type PermissionModule = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  permissions: PermissionDefinition[];
};

export async function fetchPermissionCatalog(): Promise<PermissionModule[]> {
  const sb = requireSupabase();
  const [modules, permissions] = await Promise.all([
    sb
      .from("permission_modules")
      .select("code, name, description, icon, sort_order")
      .order("sort_order"),
    sb
      .from("permissions")
      .select("code, module_code, name, description, is_sensitive, sort_order")
      .order("sort_order"),
  ]);
  if (modules.error) throw new DataAccessError(modules.error);
  if (permissions.error) throw new DataAccessError(permissions.error);

  const byModule = new Map<string, PermissionDefinition[]>();
  for (const p of permissions.data ?? []) {
    const list = byModule.get(p.module_code) ?? [];
    list.push({
      code: p.code as PermissionCode,
      moduleCode: p.module_code,
      name: p.name,
      description: p.description,
      isSensitive: p.is_sensitive,
    });
    byModule.set(p.module_code, list);
  }
  return (modules.data ?? []).map((m) => ({
    code: m.code,
    name: m.name,
    description: m.description,
    icon: m.icon,
    permissions: byModule.get(m.code) ?? [],
  }));
}

// ============================================================================
// Roles
// ============================================================================

export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSuperadmin: boolean;
  isSystem: boolean;
  userCount: number;
  updatedAt: string;
};

export async function fetchRoles(): Promise<Role[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("roles")
    .select("id, name, description, is_superadmin, is_system, updated_at, backoffice_users(count)")
    .order("is_superadmin", { ascending: false })
    .order("name");
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => {
    const count = (r.backoffice_users as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isSuperadmin: r.is_superadmin,
      isSystem: r.is_system,
      userCount: count,
      updatedAt: r.updated_at,
    };
  });
}

export async function fetchRolePermissions(roleId: string): Promise<PermissionCode[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("role_permissions")
    .select("permission_code")
    .eq("role_id", roleId);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => r.permission_code as PermissionCode);
}

export type RoleInput = {
  id: string | null;
  name: string;
  description: string | null;
  permissions: PermissionCode[];
};

/** Crea o actualiza el rol y reemplaza su set de permisos (atomico). Devuelve el id. */
export async function saveRole(input: RoleInput): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("role_save", {
    p_role_id: input.id,
    p_name: input.name.trim(),
    p_description: input.description?.trim() || null,
    p_permissions: input.permissions,
  });
  if (error) throw new DataAccessError(error);
  return data as string;
}

export async function cloneRole(roleId: string, name: string): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("role_clone", { p_role_id: roleId, p_name: name.trim() });
  if (error) throw new DataAccessError(error);
  return data as string;
}

/** Borra el rol; si tiene usuarios, pasan a reassignTo. Devuelve cuantos se movieron. */
export async function deleteRole(roleId: string, reassignTo: string | null): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("role_delete", {
    p_role_id: roleId,
    p_reassign_to: reassignTo,
  });
  if (error) throw new DataAccessError(error);
  return data as number;
}

export const RBAC_QUERY_KEYS = {
  catalog: ["rbac", "catalog"] as const,
  roles: ["rbac", "roles"] as const,
  rolePermissions: (roleId: string) => ["rbac", "role-permissions", roleId] as const,
};
