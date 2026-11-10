import type { MerchantSummary } from "./advances.types";
import { AppError, isAppError } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type { Advance, AdvanceRow, StatusAdvance } from "@/infrastructure/supabase/legacy/types";

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
  "id, comercio_id, monto_solicitado, plazo_original_dias, plazo_adelantado_dias, tasa_interes_pct, estado, motivo, fecha_acreditacion, monto_por_acreditar, fecha_solicitud, fecha_resolucion, resuelto_por, created_at, updated_at, monto_ofertado, descuento, neto_a_recibir, compensado, modelo, rechazo_motivo, aceptado_at, transaction_id, transactions!adelantos_transaction_id_fkey(id_txn, monto_operacion, bandera)";

function toAdvance(r: AdvanceRow): Advance {
  return {
    id: r.id,
    operacion:
      r.transaction_id && r.transactions
        ? {
            id: r.transaction_id,
            referencia: r.transactions.id_txn ?? r.transaction_id.slice(0, 8).toUpperCase(),
            monto: Number(r.transactions.monto_operacion),
            bandera: r.transactions.bandera,
          }
        : null,
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

export async function listAdvancesByMerchant(merchantId: string): Promise<Advance[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("adelantos")
    .select(COLUMNS)
    .eq("comercio_id", merchantId)
    .order("fecha_solicitud", { ascending: false });
  if (error) throw toAppError(error);
  return ((data ?? []) as unknown as AdvanceRow[]).map(toAdvance);
}

export async function listAdvances(filters: {
  comercioId?: string;
  estado?: StatusAdvance;
  page?: number;
  pageSize?: number;
}): Promise<Advance[]> {
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
  if (error) throw toAppError(error);
  return ((data ?? []) as unknown as AdvanceRow[]).map(toAdvance);
}

/**
 * Tope que puede pedir el comercio (RPC adelanto_tope): vendido con tarjeta y
 * no acreditado (neto estimado) menos los adelantos vigentes.
 */
export async function calcularCapAvailable(
  merchantId: string,
  excluirAdvance?: string,
): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("adelanto_tope", {
    p_comercio_id: merchantId,
    p_excluir_adelanto: excluirAdvance ?? null,
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
export async function createAdvance(input: {
  comercioId: string;
  montoSolicitado: number;
  plazoOriginalDias?: number;
  plazoAdelantadoDias: number;
  tasaInteresPct?: number | null;
  estado?: StatusAdvance;
  motivo?: string | null;
  fechaAcreditacion?: string | null;
  montoPorAcreditar?: number | null;
}): Promise<Advance> {
  const sb = requireSupabase();

  try {
    const { data: canOperar, error: rpcError } = await sb.rpc("validar_operacion_comercio", {
      p_comercio_id: input.comercioId,
    });
    if (rpcError) {
      console.warn("No se pudo validar operación del comercio:", rpcError.message);
    } else if (canOperar === false) {
      throw new AppError(
        "validation",
        "Tu comercio no tiene CVU o comisiones configuradas y no puede operar. Contactá a soporte.",
      );
    }
  } catch (e) {
    if (isAppError(e)) throw e;
    console.warn("Error al validar operación del comercio:", e);
  }

  const cap = await calcularCapAvailable(input.comercioId);
  if (input.montoSolicitado > cap) {
    throw new AppError(
      "validation",
      `El monto solicitado ($${input.montoSolicitado.toLocaleString()}) supera el máximo disponible para adelantar ($${cap.toLocaleString()}).`,
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
    tope_al_solicitar: cap,
    modelo: "v2",
  };
  const { data, error } = await sb.from("adelantos").insert(payload).select(COLUMNS).single();
  if (error) throw toAppError(error);
  return toAdvance(data as unknown as AdvanceRow);
}

export type ResultAprobarAdvance = {
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
export async function aprobarAdvance(
  id: string,
  ratePct: number,
  _Notes?: string,
  options: { monto?: number; plazoDias?: number } = {},
): Promise<ResultAprobarAdvance> {
  const sb = requireSupabase();
  let amount = options.monto;
  let plazo = options.plazoDias;
  let merchantId = "";
  if (amount == null || plazo == null) {
    const { data: a, error: e1 } = await sb
      .from("adelantos")
      .select("monto_solicitado, plazo_adelantado_dias, comercio_id")
      .eq("id", id)
      .single();
    if (e1) throw toAppError(e1);
    amount = amount ?? Number(a.monto_solicitado);
    plazo = plazo ?? Number(a.plazo_adelantado_dias);
    merchantId = String(a.comercio_id);
  }
  const { data, error } = await sb.rpc("adelanto_ofertar", {
    p_adelanto_id: id,
    p_monto: amount,
    p_tasa_pct: ratePct,
    p_plazo_dias: plazo,
  });
  if (error) throw toAppError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    adelantoId: String(r.adelanto_id ?? id),
    estado: "Aprobado",
    tasaPct: Number(r.tasa_pct ?? ratePct),
    montoSolicitado: Number(r.monto ?? amount),
    descuento: Number(r.descuento ?? 0),
    netoARecibir: Number(r.neto_a_recibir ?? 0),
    alcanza: Boolean(r.alcanza),
    comercioId: merchantId,
  };
}

export type ResultCreditAdvance = {
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
export async function creditAdvance(id: string, _Notes?: string): Promise<ResultCreditAdvance> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("adelanto_acreditar", { p_adelanto_id: id });
  if (error) throw toAppError(error);
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
export async function rechazarAdvance(id: string, notes?: string): Promise<void> {
  const sb = requireSupabase();
  const reason = notes && notes.trim().length >= 3 ? notes.trim() : "Rechazado por el backoffice";
  const { error } = await sb.rpc("adelanto_rechazar", { p_adelanto_id: id, p_motivo: reason });
  if (error) throw toAppError(error);
}

export async function updateAdvance(
  id: string,
  input: Partial<{
    montoSolicitado: number;
    plazoAdelantadoDias: number;
    tasaInteresPct: number | null;
    estado: StatusAdvance;
    motivo: string | null;
    fechaAcreditacion: string | null;
    montoPorAcreditar: number | null;
  }>,
): Promise<Advance> {
  const sb = requireSupabase();

  if (input.estado !== undefined) {
    throw new AppError(
      "validation",
      "El estado del adelanto cambia solo por su flujo (ofertar, rechazar, aceptar, acreditar), no con un update.",
    );
  }

  const payload: Record<string, unknown> = {};
  if (input.montoSolicitado !== undefined) payload.monto_solicitado = input.montoSolicitado;
  if (input.plazoAdelantadoDias !== undefined)
    payload.plazo_adelantado_dias = input.plazoAdelantadoDias;
  if (input.motivo !== undefined) payload.motivo = input.motivo;
  if (input.fechaAcreditacion !== undefined) payload.fecha_acreditacion = input.fechaAcreditacion;
  const { data, error } = await sb
    .from("adelantos")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toAdvance(data as unknown as AdvanceRow);
}

/** Nombre y legajo de los comercios de la lista de adelantos. */
export async function listAdvanceMerchants(
  ids: string[],
): Promise<Record<string, MerchantSummary>> {
  if (ids.length === 0) return {};
  const { data, error } = await requireSupabase()
    .from("comercios")
    .select("id, nombre_comercio, legajo")
    .in("id", ids);
  if (error) throw toAppError(error);
  const map: Record<string, MerchantSummary> = {};
  for (const r of (data ?? []) as {
    id: string;
    nombre_comercio: string | null;
    legajo: string;
  }[]) {
    map[r.id] = { id: r.id, nombre: r.nombre_comercio || "(sin nombre)", legajo: r.legajo };
  }
  return map;
}

export async function getAdvanceMerchantId(advanceId: string): Promise<string | null> {
  const { data, error } = await requireSupabase()
    .from("adelantos")
    .select("comercio_id")
    .eq("id", advanceId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return (data?.comercio_id as string | null) ?? null;
}

/** Deuda de comercios sin saldar (contracargos a recuperar). */
export async function listOpenMerchantDebts() {
  const { data, error } = await requireSupabase()
    .from("deudas_comercio")
    .select("comercio_id, monto, recuperado")
    .eq("saldada", false);
  if (error) throw toAppError(error);
  return (data ?? []) as { comercio_id: string | null; monto: number; recuperado: number }[];
}
