import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toChannelNotification } from "@/infrastructure/supabase/legacy/mappers";
import type {
ChannelNotification,
ChannelNotificationInput,
ChannelNotificationRow,
Page,
Pagination,
} from "@/infrastructure/supabase/legacy/types";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";

export type ChannelNotificationFilters = Pagination & {
  search?: string;
  tipo?: "Email" | "Telegram" | "WhatsApp";
  activo?: boolean;
};

const COLUMNS = "id, nombre, tipo, configuracion, activo, created_at, updated_at";

export async function listChannelsNotification(
  filters: ChannelNotificationFilters,
): Promise<Page<ChannelNotification>> {
  const sb = requireSupabase();
  const { page, pageSize, search, tipo: kind, activo: active } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("canales_notificacion").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`nombre.ilike.%${q}%`);
  }
  if (kind) query = query.eq("tipo", kind);
  if (active !== undefined) query = query.eq("activo", active);

  query = query.order("nombre", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as ChannelNotificationRow[];
  return { rows: rows.map(toChannelNotification), total: count ?? rows.length, page, pageSize };
}

export async function getChannelNotification(id: string): Promise<ChannelNotification | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("canales_notificacion")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toChannelNotification(data as ChannelNotificationRow) : null;
}

export async function createChannelNotification(
  input: ChannelNotificationInput,
): Promise<ChannelNotification> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("canales_notificacion")
    .insert({
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      configuracion: input.configuracion ?? null,
      activo: input.activo ?? true,
    })
    .select("id, nombre, tipo, configuracion, activo, created_at, updated_at")
    .single();
  if (error) throw toAppError(error);
  return toChannelNotification(data as ChannelNotificationRow);
}

export type ChannelNotificationUpdateInput = Partial<ChannelNotificationInput>;

export async function updateChannelNotification(
  id: string,
  input: ChannelNotificationUpdateInput,
): Promise<ChannelNotification> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.configuracion !== undefined) payload.configuracion = input.configuracion;
  if (input.activo !== undefined) payload.activo = input.activo;

  const { data, error } = await sb
    .from("canales_notificacion")
    .update(payload)
    .eq("id", id)
    .select("id, nombre, tipo, configuracion, activo, created_at, updated_at")
    .single();
  if (error) throw toAppError(error);
  return toChannelNotification(data as ChannelNotificationRow);
}

export async function setChannelNotificationActive(
  id: string,
  active: boolean,
): Promise<ChannelNotification> {
  return updateChannelNotification(id, { activo: active });
}

export async function deleteChannelNotification(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("canales_notificacion").delete().eq("id", id);
  if (error) throw toAppError(error);
}

// Default seed for the 3 standard channels
export const CHANNELS_NOTIFICATION_SEED: Omit<ChannelNotificationInput, "activo">[] = [
  {
    nombre: "Email",
    tipo: "Email",
    configuracion: { smtp_host: "", smtp_port: 587, from_email: "", from_name: "" },
  },
  { nombre: "Telegram", tipo: "Telegram", configuracion: { bot_token: "", chat_id: "" } },
  {
    nombre: "WhatsApp",
    tipo: "WhatsApp",
    configuracion: { api_url: "", api_token: "", phone_number_id: "" },
  },
];
