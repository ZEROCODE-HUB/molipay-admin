import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toApiRestriccion } from "./mappers";
import type {
  ApiRestriccion,
  ApiRestriccionInput,
  ApiRestriccionRow,
  EstadoRestriccion,
  Page,
  Pagination,
} from "./types";

export type ApiRestriccionFilters = Pagination & {
  search?: string;
  estado?: EstadoRestriccion;
  apiUsuarioId?: string;
};

const COLUMNS =
  "id, api_usuario_id, estado, fecha_creacion, fecha_expiracion, created_at, api_usuarios(id, codigo_usuario_api, usuario, nombre_completo, estado)";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listApiRestricciones(
  filters: ApiRestriccionFilters,
): Promise<Page<ApiRestriccion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, apiUsuarioId } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("api_restricciones").select(COLUMNS, { count: "exact" });

  if (apiUsuarioId) query = query.eq("api_usuario_id", apiUsuarioId);
  if (estado) query = query.eq("estado", estado);
  if (search && search.trim()) {
    const q = escapeLike(search);
    // search via join on api_usuarios
    query = query.or(
      `api_usuarios.codigo_usuario_api.ilike.%${q}%,api_usuarios.usuario.ilike.%${q}%,api_usuarios.nombre_completo.ilike.%${q}%`,
    );
  }

  query = query.order("fecha_creacion", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (ApiRestriccionRow & {
    api_usuarios?:
      | {
          id: string;
          codigo_usuario_api: string;
          usuario: string;
          nombre_completo: string;
          estado: string;
        }[]
      | null;
  })[];
  return { rows: rows.map(toApiRestriccion), total: count ?? rows.length, page, pageSize };
}

export async function getApiRestriccion(id: string): Promise<ApiRestriccion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_restricciones")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toApiRestriccion(data as ApiRestriccionRow) : null;
}

export async function createApiRestriccion(input: ApiRestriccionInput): Promise<ApiRestriccion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_restricciones")
    .insert({
      api_usuario_id: input.apiUsuarioId,
      estado: input.estado,
      fecha_expiracion: input.fechaExpiracion,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiRestriccion(data as ApiRestriccionRow);
}

export type ApiRestriccionUpdateInput = Partial<ApiRestriccionInput>;

export async function updateApiRestriccion(
  id: string,
  input: ApiRestriccionUpdateInput,
): Promise<ApiRestriccion> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.apiUsuarioId !== undefined) payload.api_usuario_id = input.apiUsuarioId;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.fechaExpiracion !== undefined) payload.fecha_expiracion = input.fechaExpiracion;

  const { data, error } = await sb
    .from("api_restricciones")
    .update(payload)
    .eq("id", id)
    .select(
      "id, api_usuario_id, estado, fecha_creacion, fecha_expiracion, created_at, api_usuarios(id, codigo_usuario_api, usuario, nombre_completo, estado)",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toApiRestriccion(data as ApiRestriccionRow);
}

export async function setApiRestriccionEstado(
  id: string,
  estado: EstadoRestriccion,
): Promise<ApiRestriccion> {
  return updateApiRestriccion(id, { estado });
}

export async function deleteApiRestriccion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("api_restricciones").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
