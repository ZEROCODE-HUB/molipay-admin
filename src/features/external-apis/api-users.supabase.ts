import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toApiUser } from "@/infrastructure/supabase/legacy/mappers";
import type {
ApiUser,
ApiUserInput,
ApiUserRow,
StatusApiUser,
Page,
Pagination,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type ApiUserFilters = Pagination & {
  search?: string;
  estado?: StatusApiUser;
};

const COLUMNS = "id, codigo_usuario_api, usuario, nombre_completo, estado, created_at, updated_at";

export async function listApiUsers(filters: ApiUserFilters): Promise<Page<ApiUser>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("api_usuarios").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(
      `codigo_usuario_api.ilike.%${q}%,usuario.ilike.%${q}%,nombre_completo.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("estado", status);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as ApiUserRow[];
  return { rows: rows.map(toApiUser), total: count ?? rows.length, page, pageSize };
}

export async function getApiUser(id: string): Promise<ApiUser | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("api_usuarios").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  return data ? toApiUser(data as ApiUserRow) : null;
}

export async function createApiUser(input: ApiUserInput): Promise<ApiUser> {
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
  if (error) throw toAppError(error);
  return toApiUser(data as ApiUserRow);
}

export type ApiUserUpdateInput = Partial<ApiUserInput>;

export async function updateApiUser(id: string, input: ApiUserUpdateInput): Promise<ApiUser> {
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
  if (error) throw toAppError(error);
  return toApiUser(data as ApiUserRow);
}

export async function setApiUserStatus(id: string, status: StatusApiUser): Promise<ApiUser> {
  return updateApiUser(id, { estado: status });
}

export async function deleteApiUser(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("api_usuarios").delete().eq("id", id);
  if (error) throw toAppError(error);
}

export type ApiUserEndpoint = {
  id: string;
  grupo: string;
  path: string;
  metodo: string;
  estado: string;
};

type ApiUserEndpointRow = {
  id: string;
  grupo: string | null;
  path: string | null;
  metodo: string | null;
  estado: string | null;
};

export async function listApiUserEndpoints(apiUserId: string): Promise<ApiUserEndpoint[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_usuario_endpoints")
    .select("id, grupo, path, metodo, estado")
    .eq("api_usuario_id", apiUserId)
    .order("path", { ascending: true });
  if (error) throw toAppError(error);
  const rows = (data as ApiUserEndpointRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    grupo: r.grupo ?? "General",
    path: r.path ?? "—",
    metodo: r.metodo ?? "GET",
    estado: r.estado ?? "Habilitado",
  }));
}

export type ApiUserLogDetail = {
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

export type ApiUserLog = {
  id: string;
  fechaHora: string;
  ip: string;
  clienteId: string;
  metodo: string;
  endpoint: string;
  status: number;
  tiempoRespuestaMs: number;
  detalle: ApiUserLogDetail;
};

type ApiUserLogRow = {
  id: string;
  fecha_hora: string | null;
  ip: string | null;
  cliente_id: string | null;
  metodo: string | null;
  endpoint: string | null;
  status: number | null;
  tiempo_respuesta_ms: number | null;
  detalle: ApiUserLogDetail | null;
};

export async function listApiUserLogs(apiUserId: string): Promise<ApiUserLog[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("api_usuario_logs")
    .select(
      "id, fecha_hora, ip, cliente_id, metodo, endpoint, status, tiempo_respuesta_ms, detalle",
    )
    .eq("api_usuario_id", apiUserId)
    .order("fecha_hora", { ascending: false })
    .limit(50);
  if (error) throw toAppError(error);
  const rows = (data as ApiUserLogRow[] | null) ?? [];
  return rows.map((r) => ({
    id: r.id,
    fechaHora: r.fecha_hora ?? "—",
    ip: r.ip ?? "—",
    clienteId: r.cliente_id ?? "—",
    metodo: r.metodo ?? "GET",
    endpoint: r.endpoint ?? "—",
    status: r.status ?? 0,
    tiempoRespuestaMs: r.tiempo_respuesta_ms ?? 0,
    detalle: r.detalle ?? {
      usuarioId: apiUserId,
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
