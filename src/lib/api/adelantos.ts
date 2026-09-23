import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Adelanto, AdelantoRow, EstadoAdelanto } from "./types";

const COLUMNS = "id, comercio_id, monto_solicitado, plazo_original_dias, plazo_adelantado_dias, tasa_interes_pct, estado, motivo, fecha_acreditacion, monto_por_acreditar, fecha_solicitud, fecha_resolucion, resuelto_por, created_at, updated_at";

function toAdelanto(r: AdelantoRow): Adelanto {
  return {
    id: r.id,
    comercioId: r.comercio_id,
    montoSolicitado: Number(r.monto_solicitado),
    plazoOriginalDias: Number(r.plazo_original_dias),
    plazoAdelantadoDias: Number(r.plazo_adelantado_dias),
    tasaInteresPct: r.tasa_interes_pct != null ? Number(r.tasa_interes_pct) : null,
    estado: r.estado,
    motivo: r.motivo ?? null,
    fechaAcreditacion: r.fecha_acreditacion ?? null,
    montoPorAcreditar: r.monto_por_acreditar != null ? Number(r.monto_por_acreditar) : null,
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
  motivo?: string | null;
  fechaAcreditacion?: string | null;
  montoPorAcreditar?: number | null;
}): Promise<Adelanto> {
  const sb = requireSupabase();

  // Validación: el comercio debe tener CVU y comisiones configuradas para operar
  // Basado en: detalle_reunion_revision_plataforma.md Seccion 6
  // "bloquear operaciones a nivel de servidor para comercios sin CVU/comisión configurada"
  try {
    const { data: puedeOperar, error: rpcError } = await sb.rpc("validar_operacion_comercio", {
      p_comercio_id: input.comercioId,
    });
    if (rpcError) {
      console.warn("No se pudo validar operación del comercio:", rpcError.message);
    } else if (puedeOperar === false) {
      throw new DataAccessError(
        new Error("Tu comercio no tiene CVU o comisiones configuradas y no puede operar. Contactá a soporte.")
      );
    }
  } catch (e) {
    if (e instanceof DataAccessError) throw e;
    console.warn("Error al validar operación del comercio:", e);
  }

  // Validación server-side: el adelanto no puede superar lo vendido con tarjeta por este comercio
  // Según reunión 15/09/2026: "El adelanto no puede superar lo que ese comercio efectivamente vendió con tarjeta"
  // Esta validación requiere datos de ventas (v_lotes_venta) y adelantos existentes
  // TODO: Mover esta validación a una RPC en Supabase para mayor seguridad
  try {
    const { data: ventasData } = await sb
      .from("v_lotes_venta")
      .select("importe_neto")
      .eq("comercio_id", input.comercioId);

    const totalVendido = (ventasData ?? []).reduce(
      (sum: number, v: { importe_neto: number }) => sum + Number(v.importe_neto ?? 0),
      0
    );

    const { data: adelantosData } = await sb
      .from("adelantos")
      .select("monto_por_acreditar")
      .eq("comercio_id", input.comercioId)
      .in("estado", ["Pendiente", "Aprobado"]);

    const adelantosPendientes = (adelantosData ?? []).reduce(
      (sum: number, a: { monto_por_acreditar: number | null }) =>
        sum + Number(a.monto_por_acreditar ?? 0),
      0
    );

    const montoMaximo = totalVendido - adelantosPendientes;
    if (input.montoSolicitado > montoMaximo) {
      throw new DataAccessError(
        new Error(
          `El monto solicitado ($${input.montoSolicitado.toLocaleString()}) supera el máximo disponible para adelantar ($${montoMaximo.toLocaleString()}). Ventas totales: $${totalVendido.toLocaleString()}, adelantos pendientes: $${adelantosPendientes.toLocaleString()}.`
        )
      );
    }
  } catch (e) {
    if (e instanceof DataAccessError) throw e;
    // Si falla la consulta de validación, registrar pero no bloquear (valida en frontend también)
    console.warn("No se pudo validar el monto máximo de adelanto:", e);
  }

  const payload = {
    comercio_id: input.comercioId,
    monto_solicitado: input.montoSolicitado,
    plazo_original_dias: input.plazoOriginalDias ?? 30,
    plazo_adelantado_dias: input.plazoAdelantadoDias,
    tasa_interes_pct: input.tasaInteresPct ?? null,
    estado: input.estado ?? "Pendiente",
    motivo: input.motivo ?? null,
    fecha_acreditacion: input.fechaAcreditacion ?? null,
    monto_por_acreditar: input.montoPorAcreditar ?? null,
  };
  const { data, error } = await sb.from("adelantos").insert(payload).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}

export async function updateAdelanto(
  id: string,
  input: Partial<{
    montoSolicitado: number;
    plazoAdelantadoDias: number;
    tasaInteresPct: number | null;
    estado: EstadoAdelanto;
    motivo: string | null;
    fechaAcreditacion: string | null;
    montoPorAcreditar: number | null;
  }>,
): Promise<Adelanto> {
  const sb = requireSupabase();

  // "Cancelado" es acción exclusiva del comercio — admin no puede setearlo
  if (input.estado === "Cancelado") {
    throw new DataAccessError(new Error("El estado 'Cancelado' es una acción exclusiva del comercio y no puede ser seteado por un admin."));
  }

  const payload: Record<string, unknown> = {};
  if (input.montoSolicitado !== undefined) payload.monto_solicitado = input.montoSolicitado;
  if (input.plazoAdelantadoDias !== undefined) payload.plazo_adelantado_dias = input.plazoAdelantadoDias;
  if (input.tasaInteresPct !== undefined) payload.tasa_interes_pct = input.tasaInteresPct;
  if (input.motivo !== undefined) payload.motivo = input.motivo;
  if (input.fechaAcreditacion !== undefined) payload.fecha_acreditacion = input.fechaAcreditacion;
  if (input.montoPorAcreditar !== undefined) payload.monto_por_acreditar = input.montoPorAcreditar;
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
