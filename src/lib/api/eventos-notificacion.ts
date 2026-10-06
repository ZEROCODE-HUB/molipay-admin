import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toEventoNotificacion } from "./mappers";
import type {
  EventoNotificacion,
  EventoNotificacionInput,
  EventoNotificacionRow,
  EstadoEntrega,
  Page,
  Pagination,
  TipoEventoNotificacion,
} from "./types";

export type EventoNotificacionFilters = Pagination & {
  search?: string;
  tipo?: TipoEventoNotificacion;
  audiencia?: "Admin" | "Cliente" | "Ambos";
  canal?: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega?: EstadoEntrega;
  fechaDesde?: string;
  fechaHasta?: string;
};

const COLUMNS =
  "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listEventosNotificacion(
  filters: EventoNotificacionFilters,
): Promise<Page<EventoNotificacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, tipo, audiencia, canal, estadoEntrega, fechaDesde, fechaHasta } =
    filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("eventos_notificacion").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`titulo.ilike.%${q}%,mensaje.ilike.%${q}%`);
  }
  if (tipo) query = query.eq("tipo", tipo);
  if (audiencia) query = query.eq("audiencia", audiencia);
  if (canal) query = query.eq("canal", canal);
  if (estadoEntrega) query = query.eq("estado_entrega", estadoEntrega);
  if (fechaDesde) query = query.gte("fecha", fechaDesde);
  if (fechaHasta) query = query.lte("fecha", fechaHasta);

  query = query.order("fecha", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (EventoNotificacionRow & {
    codigos_error?: { codigo: string; mensaje: string }[] | null;
  })[];
  return { rows: rows.map(toEventoNotificacion), total: count ?? rows.length, page, pageSize };
}

export async function getEventoNotificacion(id: string): Promise<EventoNotificacion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("eventos_notificacion")
    .select(
      "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toEventoNotificacion(data as EventoNotificacionRow) : null;
}

export async function createEventoNotificacion(
  input: EventoNotificacionInput,
): Promise<EventoNotificacion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("eventos_notificacion")
    .insert({
      tipo: input.tipo,
      codigo_error_id: input.codigoErrorId,
      titulo: input.titulo.trim(),
      mensaje: input.mensaje.trim(),
      audiencia: input.audiencia,
      canal: input.canal,
      estado_entrega: "pendiente",
      fecha: new Date().toISOString(),
      metadata: input.metadata ?? null,
    })
    .select(
      "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toEventoNotificacion(data as EventoNotificacionRow);
}

export type EventoNotificacionUpdateInput = Partial<EventoNotificacionInput> & {
  estado_entrega?: "pendiente" | "enviado" | "fallido" | "reintentando";
};

export async function updateEventoNotificacion(
  id: string,
  input: EventoNotificacionUpdateInput,
): Promise<EventoNotificacion> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.codigoErrorId !== undefined) payload.codigo_error_id = input.codigoErrorId;
  if (input.titulo !== undefined) payload.titulo = input.titulo.trim();
  if (input.mensaje !== undefined) payload.mensaje = input.mensaje.trim();
  if (input.audiencia !== undefined) payload.audiencia = input.audiencia;
  if (input.canal !== undefined) payload.canal = input.canal;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.estado_entrega !== undefined) payload.estado_entrega = input.estado_entrega;

  const { data, error } = await sb
    .from("eventos_notificacion")
    .update(payload)
    .eq("id", id)
    .select(
      "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toEventoNotificacion(data as EventoNotificacionRow);
}

export async function setEventoEntrega(
  id: string,
  estado: "pendiente" | "enviado" | "fallido" | "reintentando",
): Promise<EventoNotificacion> {
  return updateEventoNotificacion(id, { estado_entrega: estado });
}

export async function deleteEventoNotificacion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("eventos_notificacion").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
