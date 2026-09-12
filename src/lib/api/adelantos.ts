import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Adelanto, AdelantoRow, EstadoAdelanto } from "./types";

const COLUMNS = "id, comercio_id, monto_solicitado, plazo_original_dias, plazo_adelantado_dias, tasa_interes_pct, estado, fecha_solicitud, fecha_resolucion, resuelto_por, created_at, updated_at";

function toAdelanto(r: AdelantoRow): Adelanto {
  return {
    id: r.id,
    comercioId: r.comercio_id,
    montoSolicitado: Number(r.monto_solicitado),
    plazoOriginalDias: Number(r.plazo_original_dias),
    plazoAdelantadoDias: Number(r.plazo_adelantado_dias),
    tasaInteresPct: r.tasa_interes_pct != null ? Number(r.tasa_interes_pct) : null,
    estado: r.estado,
    fechaSolicitud: r.fecha_solicitud,
    fechaResolucion: r.fecha_resolucion,
    resueltoPor: r.resuelto_por,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listAdelantosByComercio(comercioId: string): Promise<Adelanto[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("adelantos")
    .select(COLUMNS)
    .eq("comercio_id", comercioId)
    .order("fecha_solicitud", { ascending: false });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as AdelantoRow[]).map(toAdelanto);
}

export async function listAdelantos(filters: { comercioId?: string; estado?: EstadoAdelanto; page?: number; pageSize?: number }): Promise<Adelanto[]> {
  const sb = requireSupabase();
  let q = sb.from("adelantos").select(COLUMNS).order("fecha_solicitud", { ascending: false });
  if (filters.comercioId) q = q.eq("comercio_id", filters.comercioId);
  if (filters.estado) q = q.eq("estado", filters.estado);
  if (filters.page != null && filters.pageSize != null) {
    const from = filters.page * filters.pageSize;
    const to = from + filters.pageSize - 1;
    q = q.range(from, to);
  }
  const { data, error } = await q;
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as AdelantoRow[]).map(toAdelanto);
}

export async function createAdelanto(input: {
  comercioId: string;
  montoSolicitado: number;
  plazoOriginalDias?: number;
  plazoAdelantadoDias: number;
  tasaInteresPct?: number | null;
  estado?: EstadoAdelanto;
}): Promise<Adelanto> {
  const sb = requireSupabase();
  const payload = {
    comercio_id: input.comercioId,
    monto_solicitado: input.montoSolicitado,
    plazo_original_dias: input.plazoOriginalDias ?? 30,
    plazo_adelantado_dias: input.plazoAdelantadoDias,
    tasa_interes_pct: input.tasaInteresPct ?? null,
    estado: input.estado ?? "Pendiente",
  };
  const { data, error } = await sb.from("adelantos").insert(payload).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}

export async function updateAdelanto(
  id: string,
  input: Partial<{ montoSolicitado: number; plazoAdelantadoDias: number; tasaInteresPct: number | null; estado: EstadoAdelanto }>,
): Promise<Adelanto> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.montoSolicitado !== undefined) payload.monto_solicitado = input.montoSolicitado;
  if (input.plazoAdelantadoDias !== undefined) payload.plazo_adelantado_dias = input.plazoAdelantadoDias;
  if (input.tasaInteresPct !== undefined) payload.tasa_interes_pct = input.tasaInteresPct;
  if (input.estado !== undefined) {
    payload.estado = input.estado;
    payload.fecha_resolucion = new Date().toISOString();
    try {
      const { data: auth } = await sb.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (uid) payload.resuelto_por = uid;
    } catch {
      // ignore
    }
  }
  const { data, error } = await sb.from("adelantos").update(payload).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}
