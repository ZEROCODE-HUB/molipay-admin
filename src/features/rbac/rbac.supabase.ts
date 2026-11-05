import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { callRpc } from "@/infrastructure/supabase/rpc";
import type { PermissionCode } from "./permission-codes";
import type { RbacRepository } from "./rbac.repository";
import type {
PermissionDefinition,
PermissionModule,
Role,
SessionPermissions,
} from "./rbac.types";

const context = { feature: "rbac" };

type MyPermissionsRow = {
  user: { id: string; full_name: string; email: string; staff_code: string; is_active: boolean };
  role: { id: string; name: string; is_superadmin: boolean };
  must_change_password: boolean;
  permissions_version: number;
  permissions: PermissionCode[] | null;
} | null;

type ModuleRow = { code: string; name: string; description: string | null; icon: string | null };
type PermissionRow = {
  code: string;
  module_code: string;
  name: string;
  description: string | null;
  is_sensitive: boolean;
};
type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_superadmin: boolean;
  is_system: boolean;
  updated_at: string;
  backoffice_users: { count: number }[] | null;
};

function toSessionPermissions(row: MyPermissionsRow): SessionPermissions | null {
  if (!row) return null;
  return {
    userId: row.user.id,
    fullName: row.user.full_name,
    email: row.user.email,
    staffCode: row.user.staff_code,
    isActive: row.user.is_active,
    roleId: row.role.id,
    roleName: row.role.name,
    isSuperadmin: row.role.is_superadmin,
    mustChangePassword: row.must_change_password,
    version: row.permissions_version,
    codes: row.permissions ?? [],
  };
}

function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSuperadmin: row.is_superadmin,
    isSystem: row.is_system,
    userCount: row.backoffice_users?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
  };
}

function toPermissionModules(
  modules: ModuleRow[],
  permissions: PermissionRow[],
): PermissionModule[] {
  const byModule = new Map<string, PermissionDefinition[]>();
  for (const p of permissions) {
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
  return modules.map((m) => ({ ...m, permissions: byModule.get(m.code) ?? [] }));
}

export function createSupabaseRbacRepository(): RbacRepository {
  const db = () => requireSupabase();

  return {
    async getMyPermissions({ signal } = {}) {
      const row = await callRpc<MyPermissionsRow>("my_permissions", {}, { signal, context });
      return toSessionPermissions(row);
    },

    async listPermissionModules({ signal } = {}) {
      let modulesQuery = db()
        .from("permission_modules")
        .select("code, name, description, icon")
        .order("sort_order");
      let permissionsQuery = db()
        .from("permissions")
        .select("code, module_code, name, description, is_sensitive")
        .order("sort_order");
      if (signal) {
        modulesQuery = modulesQuery.abortSignal(signal);
        permissionsQuery = permissionsQuery.abortSignal(signal);
      }
      const [modules, permissions] = await Promise.all([modulesQuery, permissionsQuery]);
      if (modules.error)
        throw toAppError(modules.error, { ...context, operation: "permission_modules" });
      if (permissions.error)
        throw toAppError(permissions.error, { ...context, operation: "permissions" });
      return toPermissionModules(
        (modules.data ?? []) as ModuleRow[],
        (permissions.data ?? []) as PermissionRow[],
      );
    },

    async listRoles({ signal } = {}) {
      let query = db()
        .from("roles")
        .select(
          "id, name, description, is_superadmin, is_system, updated_at, backoffice_users(count)",
        )
        .order("is_superadmin", { ascending: false })
        .order("name");
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw toAppError(error, { ...context, operation: "roles" });
      return ((data ?? []) as unknown as RoleRow[]).map(toRole);
    },

    async listRolePermissions(roleId, { signal } = {}) {
      let query = db().from("role_permissions").select("permission_code").eq("role_id", roleId);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw toAppError(error, { ...context, operation: "role_permissions" });
      return (data ?? []).map((r) => r.permission_code as PermissionCode);
    },

    saveRole(input) {
      return callRpc<string>(
        "role_save",
        {
          p_role_id: input.id,
          p_name: input.name.trim(),
          p_description: input.description?.trim() || null,
          p_permissions: input.permissions,
        },
        { context },
      );
    },

    cloneRole(roleId, name) {
      return callRpc<string>("role_clone", { p_role_id: roleId, p_name: name.trim() }, { context });
    },

    deleteRole(roleId, reassignTo) {
      return callRpc<number>(
        "role_delete",
        { p_role_id: roleId, p_reassign_to: reassignTo },
        { context },
      );
    },
  };
}
