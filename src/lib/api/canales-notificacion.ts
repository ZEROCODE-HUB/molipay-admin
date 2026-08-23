import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toCanalNotificacion } from "./mappers";
import type {
  CanalNotificacion,
  CanalNotificacionInput,
  CanalNotificacionRow,
  Page,
  Pagination,
} from "./types";

export type CanalNotificacionFilters = Pagination & {
  search?: string;
  tipo?: "Email" | "Telegram" | "WhatsApp";
  activo?: boolean;
};

const COLUMNS = "id, nombre, tipo, configuracion, activo, created_at, updated_at";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listCanalesNotificacion(
  filters: CanalNotificacionFilters,
): Promise<Page<CanalNotificacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, tipo, activo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("canales_notificacion").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`nombre.ilike.%${q}%`);
  }
  if (tipo) query = query.eq("tipo", tipo);
  if (activo !== undefined) query = query.eq("activo", activo);

  query = query.order("nombre", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as CanalNotificacionRow[];
  return { rows: rows.map(toCanalNotificacion), total: count ?? rows.length, page, pageSize };
}

export async function getCanalNotificacion(id: string): Promise<CanalNotificacion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("canales_notificacion")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCanalNotificacion(data as CanalNotificacionRow) : null;
}

export async function createCanalNotificacion(
  input: CanalNotificacionInput,
): Promise<CanalNotificacion> {
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
  if (error) throw new DataAccessError(error);
  return toCanalNotificacion(data as CanalNotificacionRow);
}

export type CanalNotificacionUpdateInput = Partial<CanalNotificacionInput>;

export async function updateCanalNotificacion(
  id: string,
  input: CanalNotificacionUpdateInput,
): Promise<CanalNotificacion> {
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
  if (error) throw new DataAccessError(error);
  return toCanalNotificacion(data as CanalNotificacionRow);
}

export async function setCanalNotificacionActivo(
  id: string,
  activo: boolean,
): Promise<CanalNotificacion> {
  return updateCanalNotificacion(id, { activo });
}

export async function deleteCanalNotificacion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("canales_notificacion").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// Default seed for the 3 standard channels
export const CANALES_NOTIFICACION_SEED: Omit<CanalNotificacionInput, "activo">[] = [
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
