import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

// ============================================================================
// Tipos
// ============================================================================

/**
 * Detalle de una retención devuelta por la RPC.
 *
 * Campos:
 *   - monto: el valor final que se persiste en el snapshot del lote.
 *   - alicuotaPct: alícuota efectiva aplicada. NULL si no hay
 *     asignación, si está exento, o si el cálculo no aplica.
 *   - asignado: true si el cliente tiene ese impuesto en
 *     `impuestos_asignaciones` con estado Activo. Si es false,
 *     la retención NO se aplica (monto=0).
 *   - asigTipo: tipo de la asignación ("Porcentaje" | "Fijo" | null).
 *   - asigMonto: valor de la asignación (alícuota o monto fijo).
 *   - exento: true si hay exención vigente (solo aplica a DC).
 *   - motivo: descripción humana de por qué quedó en ese valor.
 *   - aplicado: true si se calculó. false si el cliente no lo
 *     tiene asignado o si quedó en 0.
 */
export type RetencionDetalle = {
  monto: number;
  alicuotaPct: number | null;
  asignado: boolean;
  asigTipo: string | null;
  asigMonto: number | null;
  exento?: boolean;
  motivo: string;
  aplicado: boolean;
};

/** Asignación de impuesto del legajo del cliente (auditoría). */
export type AsignacionConsultada = {
  impuestoCodigo: string;
  impuestoNombre: string;
  tipo: string;
  monto: number;
  estado: string;
};

/** Resultado completo de la RPC `calcular_retenciones_lote`. */
export type ResultadoRetenciones = {
  loteId: string;
  legajo: string;
  cuit: string;
  baseImponible: number;
  comisionMolipayMonto: number;
  debitoCredito: RetencionDetalle;
  iva: RetencionDetalle;
  iibb: RetencionDetalle;
  totalRetenciones: number;
  asignacionesConsultadas: AsignacionConsultada[];
};

// ============================================================================
// RPC
// ============================================================================

/**
 * Calcula las retenciones automáticas de un lote.
 *
 * El backend consulta:
 *   - `impuestos_asignaciones` del legajo del cliente. Si el cliente
 *     no tiene asignado un impuesto, no se aplica.
 *   - `dc_excepciones` por CUIT para exención de Débito/Crédito.
 *   - `parametros_globales` como fallback de alícuotas.
 *   - `clientes.cuit` para el matching con dc_excepciones.
 *
 * IIBB queda con monto 0 y motivo "Carga manual hasta Fase 2".
 */
export async function calcularRetencionesLote(
  loteId: string,
): Promise<ResultadoRetenciones> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("calcular_retenciones_lote", {
    p_lote_id: loteId,
  });
  if (error) throw new DataAccessError(error);

  const r = (data ?? {}) as Record<string, unknown>;
  return mapResultado(r);
}

// ============================================================================
// Mapper
// ============================================================================

function toNumber(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toRetencionDetalle(v: unknown): RetencionDetalle {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    monto: toNumber(o.monto),
    alicuotaPct: o.alicuota_pct != null ? toNumber(o.alicuota_pct) : null,
    asignado: o.asignado === true,
    asigTipo: (o.asig_tipo as string) ?? null,
    asigMonto: o.asig_monto != null ? toNumber(o.asig_monto) : null,
    exento: o.exento === true,
    motivo: String(o.motivo ?? ""),
    aplicado: o.aplicado === true,
  };
}

function toAsignacion(v: Record<string, unknown>): AsignacionConsultada {
  return {
    impuestoCodigo: String(v.impuesto_codigo ?? ""),
    impuestoNombre: String(v.impuesto_nombre ?? ""),
    tipo: String(v.tipo ?? ""),
    monto: toNumber(v.monto),
    estado: String(v.estado ?? ""),
  };
}

function mapResultado(r: Record<string, unknown>): ResultadoRetenciones {
  const asignaciones = Array.isArray(r.asignaciones_consultadas)
    ? (r.asignaciones_consultadas as Record<string, unknown>[]).map(toAsignacion)
    : [];
  return {
    loteId: String(r.lote_id ?? ""),
    legajo: String(r.legajo ?? ""),
    cuit: String(r.cuit ?? ""),
    baseImponible: toNumber(r.base_imponible),
    comisionMolipayMonto: toNumber(r.comision_molipay_monto),
    debitoCredito: toRetencionDetalle(r.debito_credito),
    iva: toRetencionDetalle(r.iva),
    iibb: toRetencionDetalle(r.iibb),
    totalRetenciones: toNumber(r.total_retenciones),
    asignacionesConsultadas: asignaciones,
  };
}
