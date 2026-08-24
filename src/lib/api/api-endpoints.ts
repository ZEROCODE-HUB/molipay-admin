import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toApiEndpoint } from "./mappers";
import type {
  ApiEndpoint,
  ApiEndpointInput,
  ApiEndpointRow,
  EstadoEndpoint,
  GrupoEndpoint,
  MetodoHttp,
  Page,
  Pagination,
} from "./types";

export type ApiEndpointFilters = Pagination & {
  search?: string;
  estado?: EstadoEndpoint;
  grupo?: GrupoEndpoint;
  metodo?: MetodoHttp;
};

const COLUMNS = "id, nombre, path, metodo, descripcion, grupo, estado, rec, created_at, updated_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listApiEndpoints(filters: ApiEndpointFilters): Promise<Page<ApiEndpoint>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, grupo, metodo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("api_endpoints").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`nombre.ilike.%${q}%,path.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (grupo) query = query.eq("grupo", grupo);
  if (metodo) query = query.eq("metodo", metodo);

  query = query
    .order("grupo", { ascending: true })
    .order("nombre", { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as ApiEndpointRow[];
  return { rows: rows.map(toApiEndpoint), total: count ?? rows.length, page, pageSize };
}

export async function getApiEndpoint(id: string): Promise<ApiEndpoint | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("api_endpoints").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toApiEndpoint(data as ApiEndpointRow) : null;
}

export async function createApiEndpoint(input: ApiEndpointInput): Promise<ApiEndpoint> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_endpoints")
    .insert({
      nombre: input.nombre.trim(),
      path: input.path.trim(),
      metodo: input.metodo,
      descripcion: input.descripcion?.trim() ?? null,
      grupo: input.grupo,
      estado: input.estado,
      rec: input.rec,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiEndpoint(data as ApiEndpointRow);
}

export type ApiEndpointUpdateInput = Partial<ApiEndpointInput>;

export async function updateApiEndpoint(id: string, input: ApiEndpointInput): Promise<ApiEndpoint> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_endpoints")
    .update({
      nombre: input.nombre.trim(),
      path: input.path.trim(),
      metodo: input.metodo,
      descripcion: input.descripcion?.trim() ?? null,
      grupo: input.grupo,
      estado: input.estado,
      rec: input.rec,
    })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiEndpoint(data as ApiEndpointRow);
}

export async function setApiEndpointEstado(
  id: string,
  estado: EstadoEndpoint,
): Promise<ApiEndpoint> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_endpoints")
    .update({ estado })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiEndpoint(data as ApiEndpointRow);
}

export async function deleteApiEndpoint(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("api_endpoints").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
