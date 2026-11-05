import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toCodeCategory } from "@/infrastructure/supabase/legacy/mappers";
import type {
CodeCategory,
CodeCategoryInput,
CodeCategoryRow,
Page,
Pagination,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type CodeCategoryFilters = Pagination & {
  /** Búsqueda de texto libre: codigo, nombre o descripcion. */
  search?: string;
  estado?: "activo" | "inactivo";
};

const COLUMNS = "id, codigo, nombre, descripcion, estado, created_at, updated_at";

export async function listCodesCategory(filters: CodeCategoryFilters): Promise<Page<CodeCategory>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("codigos_categoria").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }
  if (status) query = query.eq("estado", status);

  query = query.order("codigo", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as CodeCategoryRow[];
  return {
    rows: rows.map(toCodeCategory),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getCodeCategory(id: number): Promise<CodeCategory | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("codigos_categoria")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toCodeCategory(data as CodeCategoryRow) : null;
}

export async function createCodeCategory(input: CodeCategoryInput): Promise<CodeCategory> {
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
  if (error) throw toAppError(error);
  return toCodeCategory(data as CodeCategoryRow);
}

export type CodeCategoryUpdateInput = Partial<CodeCategoryInput>;

export async function updateCodeCategory(
  id: number,
  input: CodeCategoryUpdateInput,
): Promise<CodeCategory> {
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
  if (error) throw toAppError(error);
  return toCodeCategory(data as CodeCategoryRow);
}

export async function setCodeCategoryStatus(
  id: number,
  status: "activo" | "inactivo",
): Promise<CodeCategory> {
  return updateCodeCategory(id, { estado: status });
}

export async function deleteCodeCategory(id: number): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("codigos_categoria").delete().eq("id", id);
  if (error) throw toAppError(error);
}
