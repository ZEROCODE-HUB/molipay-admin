import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toIntegracion } from "./mappers";
import type { Integracion, IntegracionInput, IntegracionRow, Page, Pagination } from "./types";

export type IntegracionFilters = Pagination & {
  search?: string;
};

const COLUMNS = "id, nombre, proveedor, created_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listIntegraciones(filters: IntegracionFilters): Promise<Page<Integracion>> {
  const sb = requireSupabase();
  const { page, pageSize, search } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("integraciones").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`id.ilike.%${q}%,nombre.ilike.%${q}%,proveedor.ilike.%${q}%`);
  }

  query = query.order("id", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as IntegracionRow[];
  return { rows: rows.map(toIntegracion), total: count ?? rows.length, page, pageSize };
}

export async function getIntegracion(id: string): Promise<Integracion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("integraciones").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toIntegracion(data as IntegracionRow) : null;
}

export async function createIntegracion(input: IntegracionInput): Promise<Integracion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("integraciones")
    .insert({
      id: input.id,
      nombre: input.nombre.trim(),
      proveedor: input.proveedor.trim(),
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toIntegracion(data as IntegracionRow);
}

export type IntegracionUpdateInput = Partial<IntegracionInput>;

export async function updateIntegracion(
  id: string,
  input: IntegracionUpdateInput,
): Promise<Integracion> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.proveedor !== undefined) payload.proveedor = input.proveedor.trim();

  const { data, error } = await sb
    .from("integraciones")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toIntegracion(data as IntegracionRow);
}

export async function deleteIntegracion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("integraciones").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
