import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Adelanto, AdelantoRow, EstadoAdelanto } from "./types";

const COLUMNS =
  "id, comercio_id, monto_solicitado, plazo_original_dias, plazo_adelantado_dias, tasa_interes_pct, estado, motivo, fecha_acreditacion, monto_por_acreditar, fecha_solicitud, fecha_resolucion, resuelto_por, created_at, updated_at";

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
 * Tope disponible que el comercio tiene para pedir un adelanto.
 *
 * Llama a la RPC `fn_calcular_tope_disponible` (fuente única de
 * verdad en la DB) en vez de recalcular la fórmula en JS. El front
 * debe usar siempre esta función para que no se desincronicen las
 * dos puntas.
 */
export async function calcularTopeDisponible(comercioId: string): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("fn_calcular_tope_disponible", {
    p_comercio_id: comercioId,
  });
  if (error) {
    // Si la RPC no existe (migración no aplicada), caemos a 0 y el
    // operador verá el problema en la consola. NO recalculamos en JS.
    console.warn("fn_calcular_tope_disponible no disponible:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/**
 * KPIs del Pool de Recaudación de la plataforma.
 *
 * El pool es la suma de saldo_disponible de TODAS las subcuentas
 * tipo='Recaudacion'. Es la única fuente de fondeo para los adelantos:
 * MoliPay NUNCA usa capital propio. La UI del backoffice muestra estos
 * tres valores en la cabecera y bloquea el botón "Acreditar" si el
 * cupo_disponible_pool es insuficiente.
 */
export type PoolRecaudacion = {
  /** Σ saldo_disponible de subcuentas tipo=Recaudacion */
  poolRecaudacionTotal: number;
  /** Σ monto_solicitado de adelantos Aprobado + Acreditado (los
   *  Acreditados aún no se repusieron al liquidar el lote real) */
  adelantosEnCurso: number;
  /** pool_recaudacion_total - adelantos_en_curso. Cuánto le queda
   *  libre al pool para autorizar nuevos Acreditar. */
  cupoDisponiblePool: number;
};

export async function obtenerPoolRecaudacion(): Promise<PoolRecaudacion> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("rpc_pool_recaudacion");
  if (error) {
    // Si la RPC no existe (migración no aplicada), caemos a 0 para no
    // romper la pantalla. La UI mostrará "Pool no disponible".
    console.warn("rpc_pool_recaudacion no disponible:", error.message);
    return {
      poolRecaudacionTotal: 0,
      adelantosEnCurso: 0,
      cupoDisponiblePool: 0,
    };
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    poolRecaudacionTotal: Number(r.pool_recaudacion_total ?? 0),
    adelantosEnCurso: Number(r.adelantos_en_curso ?? 0),
    cupoDisponiblePool: Number(r.cupo_disponible_pool ?? 0),
  };
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

  // Validación: el comercio debe tener CVU y comisiones configuradas
  // para operar. Basado en detalle_reunion_revision_plataforma.md
  // Seccion 6: "bloquear operaciones a nivel de servidor para
  // comercios sin CVU/comisión configurada".
  try {
    const { data: puedeOperar, error: rpcError } = await sb.rpc("validar_operacion_comercio", {
      p_comercio_id: input.comercioId,
    });
    if (rpcError) {
      console.warn("No se pudo validar operación del comercio:", rpcError.message);
    } else if (puedeOperar === false) {
      throw new DataAccessError(
        new Error(
          "Tu comercio no tiene CVU o comisiones configuradas y no puede operar. Contactá a soporte.",
        ),
      );
    }
  } catch (e) {
    if (e instanceof DataAccessError) throw e;
    console.warn("Error al validar operación del comercio:", e);
  }

  // Validación del tope: usamos la RPC `fn_calcular_tope_disponible`
  // (fuente única de verdad) en lugar de recalcular la fórmula en JS.
  // Si la RPC no está disponible (migración no aplicada), caemos al
  // comportamiento viejo basado en `v_lotes_venta` para no romper el
  // flujo, pero el warning queda en consola.
  try {
    const { data: rpcData, error: rpcError } = await sb.rpc("fn_calcular_tope_disponible", {
      p_comercio_id: input.comercioId,
    });
    if (!rpcError) {
      const tope = Number(rpcData ?? 0);
      if (input.montoSolicitado > tope) {
        throw new DataAccessError(
          new Error(
            `El monto solicitado ($${input.montoSolicitado.toLocaleString()}) supera el máximo disponible para adelantar ($${tope.toLocaleString()}).`,
          ),
        );
      }
    } else {
      throw new Error(rpcError.message);
    }
  } catch (e) {
    if (e instanceof DataAccessError) throw e;
    // Fallback: cálculo en JS sólo si la RPC no está disponible.
    console.warn("fn_calcular_tope_disponible no disponible, usando fallback:", e);
    try {
      const { data: ventasData } = await sb
        .from("v_lotes_venta")
        .select("importe_neto")
        .eq("comercio_id", input.comercioId);
      const totalVendido = (ventasData ?? []).reduce(
        (sum: number, v: { importe_neto: number }) => sum + Number(v.importe_neto ?? 0),
        0,
      );
      const { data: adelantosData } = await sb
        .from("adelantos")
        .select("monto_por_acreditar")
        .eq("comercio_id", input.comercioId)
        .in("estado", ["Pendiente", "Aprobado"]);
      const adelantosPendientes = (adelantosData ?? []).reduce(
        (sum: number, a: { monto_por_acreditar: number | null }) =>
          sum + Number(a.monto_por_acreditar ?? 0),
        0,
      );
      const montoMaximo = totalVendido - adelantosPendientes;
      if (input.montoSolicitado > montoMaximo) {
        throw new DataAccessError(
          new Error(
            `El monto solicitado ($${input.montoSolicitado.toLocaleString()}) supera el máximo disponible para adelantar ($${montoMaximo.toLocaleString()}). Ventas totales: $${totalVendido.toLocaleString()}, adelantos pendientes: $${adelantosPendientes.toLocaleString()}.`,
          ),
        );
      }
    } catch (inner) {
      if (inner instanceof DataAccessError) throw inner;
      console.warn("No se pudo validar el monto máximo de adelanto:", inner);
    }
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

// =====================================================================
// Acciones del admin: aprobar, rechazar y acreditar
// =====================================================================
// Estas acciones van por RPC para mantener la lógica en un solo lugar
// y para que la validación del estado sea atómica (FOR UPDATE). El
// `updateAdelanto` de abajo queda para campos menores (motivo,
// montoPorAcreditar) y para los cambios de estado que no requieren
// mover plata (Aprobado <-> Pendiente si el admin se arrepiente).

export type ResultadoAprobarAdelanto = {
  adelantoId: string;
  estado: "Aprobado";
  tasaPct: number;
  montoSolicitado: number;
  comercioId: string;
};

/** Aprueba un adelanto Pendiente y le carga la TEM. */
export async function aprobarAdelanto(
  id: string,
  tasaPct: number,
  notas?: string,
): Promise<ResultadoAprobarAdelanto> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("fn_aprobar_adelanto", {
    p_adelanto_id: id,
    p_tasa_pct: tasaPct,
    p_notas: notas ?? null,
  });
  if (error) throw new DataAccessError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    adelantoId: String(r.adelanto_id ?? id),
    estado: "Aprobado",
    tasaPct: Number(r.tasa_pct ?? tasaPct),
    montoSolicitado: Number(r.monto_solicitado ?? 0),
    comercioId: String(r.comercio_id ?? ""),
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

/** Acredita un adelanto Aprobado: mueve plata de Recaudación a Operativa. */
export async function acreditarAdelanto(
  id: string,
  notas?: string,
): Promise<ResultadoAcreditarAdelanto> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("fn_acreditar_adelanto", {
    p_adelanto_id: id,
    p_notas: notas ?? null,
  });
  if (error) throw new DataAccessError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    adelantoId: String(r.adelanto_id ?? id),
    estado: "Acreditado",
    montoSolicitado: Number(r.monto_solicitado ?? 0),
    tasaPct: Number(r.tasa_pct ?? 0),
    interes: Number(r.interes ?? 0),
    montoNetoDepositado: Number(r.monto_neto_depositado ?? 0),
    subcuentaOperativaId: String(r.subcuenta_operativa_id ?? ""),
    subcuentaRecaudacionId: String(r.subcuenta_recaudacion_id ?? ""),
    legajo: String(r.legajo ?? ""),
    fechaAcreditacion: String(r.fecha_acreditacion ?? ""),
  };
}

/**
 * Rechaza un adelanto (Pendiente o Aprobado). Sólo cambia el estado;
 * no devuelve plata porque todavía no se acreditó.
 *
 * Implementado en el cliente (no necesita RPC): no hay lock que
 * coordinar ni plata que mover. El admin debe tener permiso de
 * `modificar adelantos` para llegar a este botón.
 */
export async function rechazarAdelanto(id: string, notas?: string): Promise<Adelanto> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    estado: "Rechazado",
    fecha_resolucion: new Date().toISOString(),
  };
  // Las notas se concatenan al motivo existente
  if (notas && notas.trim().length > 0) {
    const { data: actual } = await sb
      .from("adelantos")
      .select("motivo")
      .eq("id", id)
      .maybeSingle();
    const previo = (actual?.motivo ?? "").toString().trim();
    payload.motivo = previo ? `${previo}\n${notas.trim()}` : notas.trim();
  }
  try {
    const { data: auth } = await sb.auth.getUser();
    const uid = auth?.user?.id ?? null;
    if (uid) payload.resuelto_por = uid;
  } catch {
    // ignore
  }
  const { data, error } = await sb
    .from("adelantos")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
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

  // "Cancelado" es acción exclusiva del comercio — admin no puede setearlo.
  if (input.estado === "Cancelado") {
    throw new DataAccessError(
      new Error(
        "El estado 'Cancelado' es una acción exclusiva del comercio y no puede ser seteado por un admin.",
      ),
    );
  }

  // "Acreditado" se hace por la RPC `fn_acreditar_adelanto` (mueve
  // plata). Si el front lo pide por acá, fallamos explícitamente para
  // que el dev lo cambie.
  if (input.estado === "Acreditado") {
    throw new DataAccessError(
      new Error(
        "Para acreditar un adelanto usá la función acreditarAdelanto() (RPC fn_acreditar_adelanto) — mover plata no es un update trivial.",
      ),
    );
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
  const { data, error } = await sb
    .from("adelantos")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toAdelanto(data as AdelantoRow);
}
