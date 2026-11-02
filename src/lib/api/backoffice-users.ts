import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

/**
 * Usuarios del backoffice (tabla backoffice_users).
 *
 * - Lectura: PostgREST con RLS (backoffice.users.read).
 * - Editar nombre/rol: RPC backoffice_user_update (reglas en la base).
 * - Invitar, reenviar invitacion / resetear clave, activar/desactivar: Edge
 *   Functions (necesitan la API admin de Supabase Auth).
 */

export type BackofficeUserStatus = "invited" | "active" | "inactive";

export type BackofficeUser = {
  id: string;
  staffCode: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  roleIsSuperadmin: boolean;
  mustChangePassword: boolean;
  invitedAt: string | null;
  passwordSetAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  status: BackofficeUserStatus;
};

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
  roles:
    | { name: string; is_superadmin: boolean }
    | { name: string; is_superadmin: boolean }[]
    | null;
};

const COLUMNS =
  "id, staff_code, email, full_name, is_active, role_id, must_change_password, invited_at, password_set_at, " +
  "last_login_at, created_at, roles(name, is_superadmin)";

function toBackofficeUser(r: BackofficeUserRow): BackofficeUser {
  const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
  const status: BackofficeUserStatus = !r.is_active
    ? "inactive"
    : !r.password_set_at && r.invited_at
      ? "invited"
      : "active";
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
    status,
  };
}

export type BackofficeUserFilters = Pagination & {
  search?: string;
  roleId?: string;
  status?: BackofficeUserStatus;
};

export const BACKOFFICE_USERS_QUERY_KEY = ["backoffice-users"] as const;

export async function fetchBackofficeUsers(
  filters: BackofficeUserFilters,
): Promise<Page<BackofficeUser>> {
  const sb = requireSupabase();
  const { page, pageSize, search, roleId, status } = filters;
  const from = page * pageSize;
  let query = sb.from("backoffice_users").select(COLUMNS, { count: "exact" });
  const term = search?.trim().replace(/[%_,()]/g, " ");
  if (term)
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,staff_code.ilike.%${term}%`);
  if (roleId) query = query.eq("role_id", roleId);
  if (status === "inactive") query = query.eq("is_active", false);
  if (status === "invited")
    query = query.eq("is_active", true).is("password_set_at", null).not("invited_at", "is", null);
  if (status === "active")
    query = query.eq("is_active", true).or("password_set_at.not.is.null,invited_at.is.null");
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, from + pageSize - 1);
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as unknown as BackofficeUserRow[]).map(toBackofficeUser);
  return { rows, total: count ?? rows.length, page, pageSize };
}

/** Usuarios activos para selectores (por ejemplo, ejecutivo de un comercio). */
export async function fetchActiveBackofficeUsers(): Promise<
  Pick<BackofficeUser, "id" | "fullName" | "email">[]
> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("backoffice_users")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name")
    .limit(500);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((u) => ({ id: u.id, fullName: u.full_name, email: u.email }));
}

export async function updateBackofficeUser(
  userId: string,
  fullName: string,
  roleId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("backoffice_user_update", {
    p_user_id: userId,
    p_full_name: fullName.trim(),
    p_role_id: roleId,
  });
  if (error) throw new DataAccessError(error);
}

// ---------------------------------------------------------------------------
// Edge Functions
// ---------------------------------------------------------------------------

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) {
    // supabase-js deja el body de la respuesta de error en error.context.
    let message = error.message;
    try {
      const context = (error as { context?: Response }).context;
      const payload = context ? await context.json() : null;
      if (payload?.error) message = payload.error;
    } catch {
      /* se usa el mensaje generico */
    }
    throw new Error(message);
  }
  return data as T;
}

const appOrigin = () => (typeof window !== "undefined" ? window.location.origin : undefined);

export type InviteInput = { fullName: string; email: string; roleId: string; staffCode?: string };

export function inviteBackofficeUser(input: InviteInput) {
  return invokeFunction<{ id: string; email: string; staffCode: string }>(
    "invite-backoffice-user",
    {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      roleId: input.roleId,
      staffCode: input.staffCode?.trim() || undefined,
      redirectTo: appOrigin(),
    },
  );
}

/** Reenvia la invitacion (si nunca definio clave) o resetea la clave (queda sin acceso hasta definirla). */
export function sendPasswordLink(userId: string) {
  return invokeFunction<{ ok: true; invitation: boolean }>("backoffice-user-admin", {
    action: "send_password_link",
    userId,
    redirectTo: appOrigin(),
  });
}

/** Activa o desactiva (desactivar ademas corta las sesiones abiertas). */
export function setBackofficeUserActive(userId: string, active: boolean) {
  return invokeFunction<{ ok: true; warning?: string }>("backoffice-user-admin", {
    action: "set_active",
    userId,
    active,
  });
}
