import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

// ============================================================================
// Tipos
// ============================================================================

/** Estado de la acreditación que la UI muestra. */
export type EstadoCalendario =
  | "programado"
  | "pendiente"
  | "acreditado"
  | "contracargo"
  | "cancelado";

/** Fila devuelta por la RPC `calendario_acreditaciones_v2`. */
export type CalendarioAcreditacion = {
  id: string;
  codigo: string;
  comercioId: string;
  comercioNombre: string;
  comercioLegajo: string;
  bandera: string;
  fechaVenta: string;
  fechaAcreditacion: string;
  diasHabilesAplicados: number | null;
  cantidadOperaciones: number;
  importeBruto: number;
  impuestos: number;
  tasaPaywayPct: number;
  tasaPaywayMonto: number;
  tasaMolipayPct: number;
  tasaMolipayMonto: number;
  comisionCierreLoteMonto: number;
  contracargoMonto: number;
  importeNeto: number;
  estadoLote: string;
  estadoCalculado: EstadoCalendario;
  /** Σ adelantos Pendiente/Aprobado del comercio (totalizador). */
  adelantosReservadosTotal: number;
  /** Lo que se imputa contra el día (LEAST entre neto del día y total). */
  adelantosAplicadosDia: number;
};

export type CalendarioFilters = {
  mes: number;
  anio: number;
  comercioId?: string;
  bandera?: string;
  estado?: EstadoCalendario;
};

/** Fila devuelta por `calendario_adelantos_por_dia`. */
export type AdelantoParaCalendario = {
  id: string;
  montoSolicitado: number;
  montoPorAcreditar: number | null;
  plazoOriginalDias: number;
  plazoAdelantadoDias: number;
  tasaInteresPct: number | null;
  estado: "Pendiente" | "Aprobado" | "Acreditado" | "Rechazado" | "Cancelado";
  fechaSolicitud: string;
  fechaResolucion: string | null;
  fechaAcreditacion: string | null;
  motivo: string | null;
};

/** KPIs del header. */
export type ResumenSaldos = {
  faltaCobrar: number;
  porAcreditar: number;
  adelantosEnCurso: number;
  disponibleReal: number;
};

/** Fila para export del día. */
export type ExportDiaRow = {
  id: string;
  codigo: string;
  comercioId: string;
  nombreComercio: string | null;
  legajo: string;
  bandera: string;
  fecha: string;
  cantidadOperaciones: number;
  importeBruto: number;
  impuestos: number;
  tasaPaywayPct: number;
  tasaPaywayMonto: number;
  tasaMolipayPct: number;
  tasaMolipayMonto: number;
  comisionCierreLoteMonto: number;
  contracargoMonto: number;
  importeNeto: number;
  estado: string;
};

// ============================================================================
// Helpers
// ============================================================================

function parseNumber(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toCalendarioAcreditacion(r: Record<string, unknown>): CalendarioAcreditacion {
  return {
    id: String(r.id),
    codigo: String(r.codigo ?? ""),
    comercioId: String(r.comercio_id),
    comercioNombre: String(r.comercio_nombre ?? "—"),
    comercioLegajo: String(r.comercio_legajo ?? ""),
    bandera: String(r.bandera ?? "—"),
    fechaVenta: String(r.fecha_venta ?? ""),
    fechaAcreditacion: String(r.fecha_acreditacion ?? ""),
    diasHabilesAplicados: r.dias_habiles_aplicados != null
      ? Number(r.dias_habiles_aplicados)
      : null,
    cantidadOperaciones: parseNumber(r.cantidad_operaciones),
    importeBruto: parseNumber(r.importe_bruto),
    impuestos: parseNumber(r.impuestos),
    tasaPaywayPct: parseNumber(r.tasa_payway_pct),
    tasaPaywayMonto: parseNumber(r.tasa_payway_monto),
    tasaMolipayPct: parseNumber(r.tasa_molipay_pct),
    tasaMolipayMonto: parseNumber(r.tasa_molipay_monto),
    comisionCierreLoteMonto: parseNumber(r.comision_cierre_lote_monto),
    contracargoMonto: parseNumber(r.contracargo_monto),
    importeNeto: parseNumber(r.importe_neto),
    estadoLote: String(r.estado_lote ?? ""),
    estadoCalculado: (r.estado_calculado as EstadoCalendario) ?? "pendiente",
    adelantosReservadosTotal: parseNumber(r.adelantos_reservados_total),
    adelantosAplicadosDia: parseNumber(r.adelantos_aplicados_dia),
  };
}

function toAdelantoParaCalendario(r: Record<string, unknown>): AdelantoParaCalendario {
  return {
    id: String(r.id),
    montoSolicitado: parseNumber(r.monto_solicitado),
    montoPorAcreditar: r.monto_por_acreditar != null
      ? parseNumber(r.monto_por_acreditar)
      : null,
    plazoOriginalDias: parseNumber(r.plazo_original_dias),
    plazoAdelantadoDias: parseNumber(r.plazo_adelantado_dias),
    tasaInteresPct: r.tasa_interes_pct != null
      ? parseNumber(r.tasa_interes_pct)
      : null,
    estado: r.estado as AdelantoParaCalendario["estado"],
    fechaSolicitud: String(r.fecha_solicitud ?? ""),
    fechaResolucion: (r.fecha_resolucion as string) ?? null,
    fechaAcreditacion: (r.fecha_acreditacion as string) ?? null,
    motivo: (r.motivo as string) ?? null,
  };
}

function toExportRow(r: Record<string, unknown>): ExportDiaRow {
  return {
    id: String(r.id),
    codigo: String(r.codigo ?? ""),
    comercioId: String(r.comercio_id),
    nombreComercio: (r.nombre_comercio as string) ?? null,
    legajo: String(r.legajo ?? ""),
    bandera: String(r.bandera ?? ""),
    fecha: String(r.fecha ?? ""),
    cantidadOperaciones: parseNumber(r.cantidad_operaciones),
    importeBruto: parseNumber(r.importe_bruto),
    impuestos: parseNumber(r.impuestos),
    tasaPaywayPct: parseNumber(r.tasa_payway_pct),
    tasaPaywayMonto: parseNumber(r.tasa_payway_monto),
    tasaMolipayPct: parseNumber(r.tasa_molipay_pct),
    tasaMolipayMonto: parseNumber(r.tasa_molipay_monto),
    comisionCierreLoteMonto: parseNumber(r.comision_cierre_lote_monto),
    contracargoMonto: parseNumber(r.contracargo_monto),
    importeNeto: parseNumber(r.importe_neto),
    estado: String(r.estado ?? ""),
  };
}

// ============================================================================
// RPCs
// ============================================================================

/**
 * Trae las acreditaciones que caen en el mes pedido. Ahora indexa por
 * fecha de ACREDITACIÓN (no de venta), corrigiendo el bug de la
 * implementación anterior.
 */
export async function listCalendarioAcreditaciones(
  filters: CalendarioFilters,
): Promise<CalendarioAcreditacion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("calendario_acreditaciones_v2", {
    p_mes: filters.mes,
    p_anio: filters.anio,
    p_comercio_id: filters.comercioId ?? null,
    p_bandera: filters.bandera ?? null,
    p_estado: filters.estado ?? null,
  });
  if (error) throw new DataAccessError(error);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r) => toCalendarioAcreditacion(r as Record<string, unknown>));
}

/**
 * Resumen de saldos del header. Si comercioId es null, agrega a nivel
 * plataforma.
 */
export async function getResumenSaldosCalendario(
  comercioId: string | null,
): Promise<ResumenSaldos> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("calendario_resumen_saldos", {
    p_comercio_id: comercioId,
  });
  if (error) throw new DataAccessError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  const faltaCobrar = parseNumber(r.falta_cobrar);
  const porAcreditar = parseNumber(r.por_acreditar);
  const adelantosEnCurso = parseNumber(r.adelantos_en_curso);
  // Si la RPC devuelve `disponible_real`, lo usamos; si no, lo calculamos acá
  // para mantener compat con schemas viejos.
  const disponibleReal = r.disponible_real != null
    ? parseNumber(r.disponible_real)
    : Math.max(porAcreditar - adelantosEnCurso, 0);
  return { faltaCobrar, porAcreditar, adelantosEnCurso, disponibleReal };
}

/**
 * Adelantos Pendiente/Aprobado/Acreditado del comercio. Si se pasa
 * fecha, prioriza los Acreditados de ese día.
 */
export async function getAdelantosPorDia(
  comercioId: string,
  fecha: string | null,
): Promise<AdelantoParaCalendario[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("calendario_adelantos_por_dia", {
    p_comercio_id: comercioId,
    p_fecha: fecha,
  });
  if (error) throw new DataAccessError(error);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r) => toAdelantoParaCalendario(r as Record<string, unknown>));
}

/**
 * Filas del día para exportación (Excel/PDF). Mismo shape que el
 * modal de detalle.
 */
export async function getExportDia(
  fecha: string,
  comercioId: string | null,
): Promise<ExportDiaRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("calendario_exportar_dia", {
    p_fecha: fecha,
    p_comercio_id: comercioId,
  });
  if (error) throw new DataAccessError(error);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r) => toExportRow(r as Record<string, unknown>));
}

/**
 * Monto mínimo de adelanto, configurado en `parametros_globales`. Si
 * no está seteado, devuelve 100 por defecto.
 */
export async function getMinMontoAdelanto(): Promise<number> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb
      .from("parametros_globales")
      .select("valor")
      .eq("clave", "min_monto_adelanto")
      .maybeSingle();
    if (error) {
      console.warn("getMinMontoAdelanto: error leyendo parametro_globales:", error.message);
      return 100;
    }
    const n = data?.valor != null ? Number(data.valor) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 100;
  } catch (e) {
    console.warn("getMinMontoAdelanto: fallback a 100:", e);
    return 100;
  }
}
