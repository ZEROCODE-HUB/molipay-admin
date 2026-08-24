import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toAdminUser } from "./mappers";
import type { AdminUser, AdminUserRow, Page, Pagination } from "./types";

export type AdminUserFilters = Pagination & {
  search?: string;
  /** FK al catálogo `roles`. */
  rolId?: string;
  activo?: boolean;
};

const COLUMNS = "id, legajo, email, nombre, rol_id, activo, created_at, updated_at";

/** Lista de usuarios del backoffice. Requiere rol admin (RLS). */
export async function listAdminUsers(
  filters: AdminUserFilters = { page: 0, pageSize: 50 },
): Promise<Page<AdminUser>> {
  const sb = requireSupabase();
  const { page, pageSize, search, rolId, activo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("admin_users").select(COLUMNS, { count: "exact" });
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`legajo.ilike.%${q}%,email.ilike.%${q}%,nombre.ilike.%${q}%`);
  }
  if (rolId) query = query.eq("rol_id", rolId);
  if (typeof activo === "boolean") query = query.eq("activo", activo);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as AdminUserRow[];
  return { rows: rows.map(toAdminUser), total: count ?? rows.length, page, pageSize };
}

export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("admin_users").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toAdminUser(data as AdminUserRow) : null;
}
