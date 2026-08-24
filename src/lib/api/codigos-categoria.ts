import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toCodigoCategoria } from "./mappers";
import type {
  CodigoCategoria,
  CodigoCategoriaInput,
  CodigoCategoriaRow,
  Page,
  Pagination,
} from "./types";

export type CodigoCategoriaFilters = Pagination & {
  /** Búsqueda de texto libre: codigo, nombre o descripcion. */
  search?: string;
  estado?: "activo" | "inactivo";
};

const COLUMNS = "id, codigo, nombre, descripcion, estado, created_at, updated_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listCodigosCategoria(
  filters: CodigoCategoriaFilters,
): Promise<Page<CodigoCategoria>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("codigos_categoria").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);

  query = query.order("codigo", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as CodigoCategoriaRow[];
  return {
    rows: rows.map(toCodigoCategoria),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getCodigoCategoria(id: number): Promise<CodigoCategoria | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("codigos_categoria")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCodigoCategoria(data as CodigoCategoriaRow) : null;
}

export async function createCodigoCategoria(input: CodigoCategoriaInput): Promise<CodigoCategoria> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("codigos_categoria")
    .insert({
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion.trim(),
      estado: input.estado ?? "activo",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCodigoCategoria(data as CodigoCategoriaRow);
}

export type CodigoCategoriaUpdateInput = Partial<CodigoCategoriaInput>;

export async function updateCodigoCategoria(
  id: number,
  input: CodigoCategoriaUpdateInput,
): Promise<CodigoCategoria> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo.trim();
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion.trim();
  if (input.estado !== undefined) payload.estado = input.estado;

  const { data, error } = await sb
    .from("codigos_categoria")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCodigoCategoria(data as CodigoCategoriaRow);
}

export async function setCodigoCategoriaEstado(
  id: number,
  estado: "activo" | "inactivo",
): Promise<CodigoCategoria> {
  return updateCodigoCategoria(id, { estado });
}

export async function deleteCodigoCategoria(id: number): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("codigos_categoria").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
