import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Adelanto, AdelantoRow, EstadoAdelanto } from "./types";

// Adelantos de dinero (modulo de acreditaciones).
//
// Ciclo: Pendiente (Solicitado) -> Aprobado (Ofertado, con tasa) ->
// Aceptado (lo acepta la empresa) -> Acreditado -> Compensado (se descuenta
// solo al acreditar los proximos lotes del comercio).
//
// Los cambios de estado pasan por RPCs SECURITY DEFINER:
//   adelanto_ofertar, adelanto_rechazar, adelanto_acreditar (backoffice)
//   adelanto_aceptar, cancelar_adelanto (empresa)
// El adelanto sale de la recaudadora comun de Payway, no de una subcuenta
// del comercio. La tasa es un descuento unico: monto x tasa.

const COLUMNS =
  "id, comercio_id, monto_solicitado, plazo_original_dias, plazo_adelantado_dias, tasa_interes_pct, estado, motivo, fecha_acreditacion, monto_por_acreditar, fecha_solicitud, fecha_resolucion, resuelto_por, created_at, updated_at, monto_ofertado, descuento, neto_a_recibir, compensado, modelo, rechazo_motivo, aceptado_at";

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
    montoOfertado: r.monto_ofertado != null ? Number(r.monto_ofertado) : null,
    descuento: r.descuento != null ? Number(r.descuento) : null,
    netoARecibir: r.neto_a_recibir != null ? Number(r.neto_a_recibir) : null,
    compensado: Number(r.compensado ?? 0),
    modelo: r.modelo ?? "legacy",
    rechazoMotivo: r.rechazo_motivo ?? null,
    aceptadoAt: r.aceptado_at ?? null,
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

export async function listAdelantos(filters: {
  comercioId?: string;
  estado?: EstadoAdelanto;
  page?: number;
  pageSize?: number;
}): Promise<Adelanto[]> {
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

/**
 * Tope que puede pedir el comercio (RPC adelanto_tope): vendido con tarjeta y
 * no acreditado (neto estimado) menos los adelantos vigentes.
 */
export async function calcularTopeDisponible(comercioId: string, excluirAdelanto?: string): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("adelanto_tope", {
    p_comercio_id: comercioId,
    p_excluir_adelanto: excluirAdelanto ?? null,
  });
  if (error) {
    console.warn("adelanto_tope no disponible:", error.message);
    return 0;
  }
  return Number((data as { tope?: number } | null)?.tope ?? 0);
}

export type PoolRecaudacion = {
  /** Lo que entro a la recaudadora de Payway y todavia no se acredito. */
  poolRecaudacionTotal: number;
  /** Adelantos acreditados que falta compensar. */
  adelantosEnCurso: number;
  /** Disponible para nuevos adelantos. */
  cupoDisponiblePool: number;
};

/** Estado de la recaudadora de Payway (RPC recaudadora_estado). */
export async function obtenerPoolRecaudacion(): Promise<PoolRecaudacion> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("recaudadora_estado");
  if (error) {
    console.warn("recaudadora_estado no disponible:", error.message);
    return { poolRecaudacionTotal: 0, adelantosEnCurso: 0, cupoDisponiblePool: 0 };
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    poolRecaudacionTotal: Number(r.pendiente_acreditar ?? 0),
    adelantosEnCurso: Number(r.adelantos_sin_compensar ?? 0),
    cupoDisponiblePool: Number(r.disponible_adelantos ?? 0),
  };
}

/**
 * Alta de un adelanto desde el backoffice (en nombre del comercio). Queda
 * Pendiente (Solicitado) y sigue el mismo ciclo que los que pide la empresa.
 */
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

  try {
    const { data: puedeOperar, error: rpcError } = await sb.rpc("validar_operacion_comercio", {
      p_comercio_id: input.comercioId,
    });
    if (rpcError) {
      console.warn("No se pudo validar operación del comercio:", rpcError.message);
    } else if (puedeOperar === false) {
      throw new DataAccessError(
        new Error("Tu comercio no tiene CVU o comisiones configuradas y no puede operar. Contactá a soporte."),
      );
    }
  } catch (e) {
    if (e instanceof DataAccessError) throw e;
    console.warn("Error al validar operación del comercio:", e);
  }

  const tope = await calcularTopeDisponible(input.comercioId);
  if (input.montoSolicitado > tope) {
    throw new DataAccessError(
      new Error(
        `El monto solicitado ($${input.montoSolicitado.toLocaleString()}) supera el máximo disponible para adelantar ($${tope.toLocaleString()}).`,
      ),
    );
  }

  const payload = {
    comercio_id: input.comercioId,
    monto_solicitado: input.montoSolicitado,
    plazo_original_dias: input.plazoOriginalDias ?? 30,
    plazo_adelantado_dias: input.plazoAdelantadoDias,
    estado: "Pendiente",
    motivo: input.motivo ?? null,
    fecha_acreditacion: input.fechaAcreditacion ?? null,
    tope_al_solicitar: tope,
    modelo: "v2",
  };
  const { data, error } = await sb.from("adelantos").insert(payload).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}

export type ResultadoAprobarAdelanto = {
  adelantoId: string;
  estado: "Aprobado";
  tasaPct: number;
  montoSolicitado: number;
  descuento: number;
  netoARecibir: number;
  alcanza: boolean;
  comercioId: string;
};

/**
 * Oferta al comercio (RPC adelanto_ofertar): monto, tasa y plazo. Si no se
 * pasan monto / plazo se usan los del pedido. La empresa despues acepta o
 * cancela desde su portal.
 */
export async function aprobarAdelanto(
  id: string,
  tasaPct: number,
  _notas?: string,
  opciones: { monto?: number; plazoDias?: number } = {},
): Promise<ResultadoAprobarAdelanto> {
  const sb = requireSupabase();
  let monto = opciones.monto;
  let plazo = opciones.plazoDias;
  let comercioId = "";
  if (monto == null || plazo == null) {
    const { data: a, error: e1 } = await sb
      .from("adelantos")
      .select("monto_solicitado, plazo_adelantado_dias, comercio_id")
      .eq("id", id)
      .single();
    if (e1) throw new DataAccessError(e1);
    monto = monto ?? Number(a.monto_solicitado);
    plazo = plazo ?? Number(a.plazo_adelantado_dias);
    comercioId = String(a.comercio_id);
  }
  const { data, error } = await sb.rpc("adelanto_ofertar", {
    p_adelanto_id: id,
    p_monto: monto,
    p_tasa_pct: tasaPct,
    p_plazo_dias: plazo,
  });
  if (error) throw new DataAccessError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    adelantoId: String(r.adelanto_id ?? id),
    estado: "Aprobado",
    tasaPct: Number(r.tasa_pct ?? tasaPct),
    montoSolicitado: Number(r.monto ?? monto),
    descuento: Number(r.descuento ?? 0),
    netoARecibir: Number(r.neto_a_recibir ?? 0),
    alcanza: Boolean(r.alcanza),
    comercioId,
  };
}

export type ResultadoAcreditarAdelanto = {
  adelantoId: string;
  estado: "Acreditado";
  montoSolicitado: number;
  tasaPct: number;
  interes: number;
  montoNetoDepositado: number;
  subcuentaOperativaId: string;
  subcuentaRecaudacionId: string;
  legajo: string;
  fechaAcreditacion: string;
};

/**
 * Acredita un adelanto Aceptado por la empresa (RPC adelanto_acreditar): el
 * neto pasa a la Operativa del comercio desde la recaudadora de Payway.
 */
export async function acreditarAdelanto(id: string, _notas?: string): Promise<ResultadoAcreditarAdelanto> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("adelanto_acreditar", { p_adelanto_id: id });
  if (error) throw new DataAccessError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    adelantoId: String(r.adelanto_id ?? id),
    estado: "Acreditado",
    montoSolicitado: Number(r.monto ?? 0),
    tasaPct: 0,
    interes: Number(r.descuento ?? 0),
    montoNetoDepositado: Number(r.neto_depositado ?? 0),
    subcuentaOperativaId: "",
    subcuentaRecaudacionId: "",
    legajo: "",
    fechaAcreditacion: new Date().toISOString().slice(0, 10),
  };
}

/** Rechazo con motivo (RPC adelanto_rechazar). */
export async function rechazarAdelanto(id: string, notas?: string): Promise<void> {
  const sb = requireSupabase();
  const motivo = notas && notas.trim().length >= 3 ? notas.trim() : "Rechazado por el backoffice";
  const { error } = await sb.rpc("adelanto_rechazar", { p_adelanto_id: id, p_motivo: motivo });
  if (error) throw new DataAccessError(error);
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

  if (input.estado !== undefined) {
    throw new DataAccessError(
      new Error("El estado del adelanto cambia solo por su flujo (ofertar, rechazar, aceptar, acreditar), no con un update."),
    );
  }

  const payload: Record<string, unknown> = {};
  if (input.montoSolicitado !== undefined) payload.monto_solicitado = input.montoSolicitado;
  if (input.plazoAdelantadoDias !== undefined) payload.plazo_adelantado_dias = input.plazoAdelantadoDias;
  if (input.motivo !== undefined) payload.motivo = input.motivo;
  if (input.fechaAcreditacion !== undefined) payload.fecha_acreditacion = input.fechaAcreditacion;
  const { data, error } = await sb.from("adelantos").update(payload).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}
