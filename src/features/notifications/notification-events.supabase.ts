import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toEventNotification } from "@/infrastructure/supabase/legacy/mappers";
import type {
EventNotification,
EventNotificationInput,
EventNotificationRow,
StatusEntrega,
Page,
Pagination,
KindEventNotification,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type EventNotificationFilters = Pagination & {
  search?: string;
  tipo?: KindEventNotification;
  audiencia?: "Admin" | "Cliente" | "Ambos";
  canal?: "Email" | "Telegram" | "WhatsApp";
  estadoEntrega?: StatusEntrega;
  fechaDesde?: string;
  fechaHasta?: string;
};

const COLUMNS =
  "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)";

export async function listEventsNotification(
  filters: EventNotificationFilters,
): Promise<Page<EventNotification>> {
  const sb = requireSupabase();
  const {
    page,
    pageSize,
    search,
    tipo: kind,
    audiencia,
    canal: channel,
    estadoEntrega: statusEntrega,
    fechaDesde: dateFrom,
    fechaHasta: dateTo,
  } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("eventos_notificacion").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`titulo.ilike.%${q}%,mensaje.ilike.%${q}%`);
  }
  if (kind) query = query.eq("tipo", kind);
  if (audiencia) query = query.eq("audiencia", audiencia);
  if (channel) query = query.eq("canal", channel);
  if (statusEntrega) query = query.eq("estado_entrega", statusEntrega);
  if (dateFrom) query = query.gte("fecha", dateFrom);
  if (dateTo) query = query.lte("fecha", dateTo);

  query = query.order("fecha", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as (EventNotificationRow & {
    codigos_error?: { codigo: string; mensaje: string }[] | null;
  })[];
  return { rows: rows.map(toEventNotification), total: count ?? rows.length, page, pageSize };
}

export async function getEventNotification(id: string): Promise<EventNotification | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("eventos_notificacion")
    .select(
      "id, tipo, codigo_error_id, titulo, mensaje, audiencia, canal, estado_entrega, fecha, metadata, created_at, updated_at, codigos_error(codigo, mensaje)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toEventNotification(data as EventNotificationRow) : null;
}

export async function createEventNotification(
  input: EventNotificationInput,
): Promise<EventNotification> {
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
  if (error) throw toAppError(error);
  return toEventNotification(data as EventNotificationRow);
}

export type EventNotificationUpdateInput = Partial<EventNotificationInput> & {
  estado_entrega?: "pendiente" | "enviado" | "fallido" | "reintentando";
};

export async function updateEventNotification(
  id: string,
  input: EventNotificationUpdateInput,
): Promise<EventNotification> {
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
  if (error) throw toAppError(error);
  return toEventNotification(data as EventNotificationRow);
}

export async function setEventEntrega(
  id: string,
  status: "pendiente" | "enviado" | "fallido" | "reintentando",
): Promise<EventNotification> {
  return updateEventNotification(id, { estado_entrega: status });
}

export async function deleteEventNotification(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("eventos_notificacion").delete().eq("id", id);
  if (error) throw toAppError(error);
}
