import { requireSupabase } from "@/infrastructure/supabase/client";
import { invokeEdgeFunction } from "@/infrastructure/supabase/edge-functions";
import { toAppError } from "@/infrastructure/supabase/errors";
import { callRpc } from "@/infrastructure/supabase/rpc";
import type { BackofficeUsersRepository } from "./backoffice-users.repository";
import type { BackofficeUser,BackofficeUserStatus } from "./backoffice-users.types";

const context = { feature: "backoffice-users" };

const COLUMNS =
  "id, staff_code, email, full_name, is_active, role_id, must_change_password, invited_at, password_set_at, " +
  "last_login_at, created_at, roles(name, is_superadmin)";

type RoleRef = { name: string; is_superadmin: boolean };

type BackofficeUserRow = {
  id: string;
  staff_code: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_id: string;
  must_change_password: boolean;
  invited_at: string | null;
  password_set_at: string | null;
  last_login_at: string | null;
  created_at: string;
  roles: RoleRef | RoleRef[] | null;
};

/** Estado visible: inactivo, invitado (nunca definio clave) o activo. */
export function statusOf(
  row: Pick<BackofficeUserRow, "is_active" | "password_set_at" | "invited_at">,
): BackofficeUserStatus {
  if (!row.is_active) return "inactive";
  return !row.password_set_at && row.invited_at ? "invited" : "active";
}

export function toBackofficeUser(r: BackofficeUserRow): BackofficeUser {
  const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
  return {
    id: r.id,
    staffCode: r.staff_code,
    email: r.email,
    fullName: r.full_name,
    isActive: r.is_active,
    roleId: r.role_id,
    roleName: role?.name ?? "—",
    roleIsSuperadmin: role?.is_superadmin ?? false,
    mustChangePassword: r.must_change_password,
    invitedAt: r.invited_at,
    passwordSetAt: r.password_set_at,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
    status: statusOf(r),
  };
}

/** Origen de la app para los links de invitacion / reseteo. */
const appOrigin = () => (typeof window !== "undefined" ? window.location.origin : undefined);

export function createSupabaseBackofficeUsersRepository(): BackofficeUsersRepository {
  const db = () => requireSupabase();

  return {
    async list({ page, pageSize, search, roleId, status }, { signal } = {}) {
      const from = page * pageSize;
      let query = db().from("backoffice_users").select(COLUMNS, { count: "exact" });
      // Caracteres que romperian el filtro "or" de PostgREST.
      const term = search?.trim().replace(/[%_,()]/g, " ");
      if (term)
        query = query.or(
          `full_name.ilike.%${term}%,email.ilike.%${term}%,staff_code.ilike.%${term}%`,
        );
      if (roleId) query = query.eq("role_id", roleId);
      if (status === "inactive") query = query.eq("is_active", false);
      if (status === "invited")
        query = query
          .eq("is_active", true)
          .is("password_set_at", null)
          .not("invited_at", "is", null);
      if (status === "active")
        query = query.eq("is_active", true).or("password_set_at.not.is.null,invited_at.is.null");
      query = query
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + pageSize - 1);
      if (signal) query = query.abortSignal(signal);
      const { data, error, count } = await query;
      if (error) throw toAppError(error, { ...context, operation: "backoffice_users" });
      const rows = ((data ?? []) as unknown as BackofficeUserRow[]).map(toBackofficeUser);
      return { rows, total: count ?? rows.length, page, pageSize };
    },

    async listActiveOptions({ signal } = {}) {
      let query = db()
        .from("backoffice_users")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name")
        .limit(500);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw toAppError(error, { ...context, operation: "backoffice_users.active" });
      return (data ?? []).map((u) => ({ id: u.id, fullName: u.full_name, email: u.email }));
    },

    update(userId, fullName, roleId) {
      return callRpc<void>(
        "backoffice_user_update",
        { p_user_id: userId, p_full_name: fullName.trim(), p_role_id: roleId },
        { context },
      );
    },

    invite(input) {
      return invokeEdgeFunction(
        "invite-backoffice-user",
        {
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          roleId: input.roleId,
          staffCode: input.staffCode?.trim() || undefined,
          redirectTo: appOrigin(),
        },
        { context },
      );
    },

    sendPasswordLink(userId) {
      return invokeEdgeFunction(
        "backoffice-user-admin",
        { action: "send_password_link", userId, redirectTo: appOrigin() },
        { context },
      );
    },

    setActive(userId, active) {
      return invokeEdgeFunction(
        "backoffice-user-admin",
        { action: "set_active", userId, active },
        { context },
      );
    },
  };
}
