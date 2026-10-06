import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toApiUsuario } from "./mappers";
import type {
  ApiUsuario,
  ApiUsuarioInput,
  ApiUsuarioRow,
  EstadoApiUsuario,
  Page,
  Pagination,
} from "./types";

export type ApiUsuarioFilters = Pagination & {
  search?: string;
  estado?: EstadoApiUsuario;
};

const COLUMNS = "id, codigo_usuario_api, usuario, nombre_completo, estado, created_at, updated_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listApiUsuarios(filters: ApiUsuarioFilters): Promise<Page<ApiUsuario>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("api_usuarios").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(
      `codigo_usuario_api.ilike.%${q}%,usuario.ilike.%${q}%,nombre_completo.ilike.%${q}%`,
    );
  }
  if (estado) query = query.eq("estado", estado);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as ApiUsuarioRow[];
  return { rows: rows.map(toApiUsuario), total: count ?? rows.length, page, pageSize };
}

export async function getApiUsuario(id: string): Promise<ApiUsuario | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("api_usuarios").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toApiUsuario(data as ApiUsuarioRow) : null;
}

export async function createApiUsuario(input: ApiUsuarioInput): Promise<ApiUsuario> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_usuarios")
    .insert({
      codigo_usuario_api: input.codigoUsuarioApi.trim(),
      usuario: input.usuario.trim(),
      nombre_completo: input.nombreCompleto.trim(),
      estado: input.estado ?? "Pendiente Validación",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiUsuario(data as ApiUsuarioRow);
}

export type ApiUsuarioUpdateInput = Partial<ApiUsuarioInput>;

export async function updateApiUsuario(
  id: string,
  input: ApiUsuarioUpdateInput,
): Promise<ApiUsuario> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigoUsuarioApi !== undefined)
    payload.codigo_usuario_api = input.codigoUsuarioApi.trim();
  if (input.usuario !== undefined) payload.usuario = input.usuario.trim();
  if (input.nombreCompleto !== undefined) payload.nombre_completo = input.nombreCompleto.trim();
  if (input.estado !== undefined) payload.estado = input.estado;

  const { data, error } = await sb
    .from("api_usuarios")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toApiUsuario(data as ApiUsuarioRow);
}

export async function setApiUsuarioEstado(
  id: string,
  estado: EstadoApiUsuario,
): Promise<ApiUsuario> {
  return updateApiUsuario(id, { estado });
}

export async function deleteApiUsuario(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("api_usuarios").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export type ApiUsuarioEndpoint = {
  id: string;
  grupo: string;
  path: string;
  metodo: string;
  estado: string;
};

type ApiUsuarioEndpointRow = {
  id: string;
  grupo: string | null;
  path: string | null;
  metodo: string | null;
  estado: string | null;
};

export async function listApiUsuarioEndpoints(
  apiUsuarioId: string,
): Promise<ApiUsuarioEndpoint[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_usuario_endpoints")
    .select("id, grupo, path, metodo, estado")
    .eq("api_usuario_id", apiUsuarioId)
    .order("path", { ascending: true });
  if (error) throw new DataAccessError(error);
  const rows = (data as ApiUsuarioEndpointRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    grupo: r.grupo ?? "General",
    path: r.path ?? "—",
    metodo: r.metodo ?? "GET",
    estado: r.estado ?? "Habilitado",
  }));
}

export type ApiUsuarioLogDetalle = {
  usuarioId: string;
  clientId: string | null;
  ip: string;
  metodoHttp: string;
  estadoHttp: number;
  endpoint: string;
  tiempoRespuesta: string;
  userAgent: string;
  fecha: string;
  requestHeaders: Record<string, string>;
  requestParams: unknown;
  requestQuery: unknown;
  requestBody: unknown;
  responseBody: unknown;
};

export type ApiUsuarioLog = {
  id: string;
  fechaHora: string;
  ip: string;
  clienteId: string;
  metodo: string;
  endpoint: string;
  status: number;
  tiempoRespuestaMs: number;
  detalle: ApiUsuarioLogDetalle;
};

type ApiUsuarioLogRow = {
  id: string;
  fecha_hora: string | null;
  ip: string | null;
  cliente_id: string | null;
  metodo: string | null;
  endpoint: string | null;
  status: number | null;
  tiempo_respuesta_ms: number | null;
  detalle: ApiUsuarioLogDetalle | null;
};

export async function listApiUsuarioLogs(apiUsuarioId: string): Promise<ApiUsuarioLog[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_usuario_logs")
    .select(
      "id, fecha_hora, ip, cliente_id, metodo, endpoint, status, tiempo_respuesta_ms, detalle",
    )
    .eq("api_usuario_id", apiUsuarioId)
    .order("fecha_hora", { ascending: false })
    .limit(50);
  if (error) throw new DataAccessError(error);
  const rows = (data as ApiUsuarioLogRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    fechaHora: r.fecha_hora ?? "—",
    ip: r.ip ?? "—",
    clienteId: r.cliente_id ?? "—",
    metodo: r.metodo ?? "GET",
    endpoint: r.endpoint ?? "—",
    status: r.status ?? 0,
    tiempoRespuestaMs: r.tiempo_respuesta_ms ?? 0,
    detalle:
      r.detalle ?? {
        usuarioId: apiUsuarioId,
        clientId: null,
        ip: r.ip ?? "—",
        metodoHttp: r.metodo ?? "GET",
        estadoHttp: r.status ?? 0,
        endpoint: r.endpoint ?? "—",
        tiempoRespuesta: `${r.tiempo_respuesta_ms ?? 0}ms`,
        userAgent: "—",
        fecha: r.fecha_hora ?? "—",
        requestHeaders: {},
        requestParams: {},
        requestQuery: {},
        requestBody: {},
        responseBody: {},
      },
  }));
}
