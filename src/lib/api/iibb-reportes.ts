import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

/**
 * Ingresos Brutos: normalizacion retroactiva del mes en curso y presentaciones
 * por tramo (migracion 20261103110000).
 *
 * - tax_normalization_runs / tax_normalization_items: preview -> aplicar.
 * - tax_filings / tax_filing_items: una version por generacion; la ultima es la
 *   vigente (current) y las anteriores quedan reemplazadas.
 */

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new DataAccessError(error);
  return data as T;
}

const num = (v: number | string | null | undefined) => Number(v ?? 0);

// ============================================================================
// Normalizacion retroactiva
// ============================================================================

export type EstadoCorrida = "Preview" | "Aplicada" | "Descartada";

const ESTADO_CORRIDA: Record<string, EstadoCorrida> = {
  preview: "Preview",
  applied: "Aplicada",
  discarded: "Descartada",
};

export type CorridaNormalizacion = {
  id: string;
  padronId: string;
  periodo: string;
  desde: string;
  hasta: string;
  estado: EstadoCorrida;
  operaciones: number;
  clientes: number;
  totalBase: number;
  totalAjuste: number;
  creadaAt: string;
  aplicadaAt: string | null;
};

export type ItemNormalizacion = {
  id: string;
  transactionId: string;
  legajo: string;
  cuit: string | null;
  razonSocial: string | null;
  fecha: string;
  base: number;
  alicuotaAnterior: number;
  alicuotaNueva: number;
  montoAnterior: number;
  montoNuevo: number;
  ajuste: number;
};

const RUN_COLUMNS =
  "id, registry_id, period, date_from, date_to, status, operations_count, clients_count, total_base, total_delta, created_at, applied_at";

type RunRow = {
  id: string;
  registry_id: string;
  period: string;
  date_from: string;
  date_to: string;
  status: string;
  operations_count: number;
  clients_count: number;
  total_base: number | string;
  total_delta: number | string;
  created_at: string;
  applied_at: string | null;
};

const toCorrida = (r: RunRow): CorridaNormalizacion => ({
  id: r.id,
  padronId: r.registry_id,
  periodo: r.period,
  desde: r.date_from,
  hasta: r.date_to,
  estado: ESTADO_CORRIDA[r.status] ?? "Descartada",
  operaciones: r.operations_count,
  clientes: r.clients_count,
  totalBase: num(r.total_base),
  totalAjuste: num(r.total_delta),
  creadaAt: r.created_at,
  aplicadaAt: r.applied_at,
});

export const QK_NORMALIZACION = ["tax_normalization_runs"] as const;

/** Recalcula con el padron lo ya retenido en el mes en curso. No cambia nada: deja una corrida en preview. */
export async function generarPreviewNormalizacion(padronId: string): Promise<CorridaNormalizacion> {
  const r = await rpc<{ run_id: string }>("tax_normalization_preview", { p_registry_id: padronId });
  return getCorrida(r.run_id);
}

export async function getCorrida(id: string): Promise<CorridaNormalizacion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_normalization_runs")
    .select(RUN_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw new DataAccessError(error);
  return toCorrida(data as RunRow);
}

/** Corridas recientes (para el historial de normalizaciones). */
export async function listCorridas(limite = 20): Promise<CorridaNormalizacion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_normalization_runs")
    .select(RUN_COLUMNS)
    .neq("status", "discarded")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as RunRow[]).map(toCorrida);
}

/** Items de la corrida, de a paginas de 1000 (limite de PostgREST). */
export async function listItemsCorrida(
  runId: string,
  maximo = 20000,
): Promise<ItemNormalizacion[]> {
  const sb = requireSupabase();
  const out: ItemNormalizacion[] = [];
  const pagina = 1000;
  for (let desde = 0; desde < maximo; desde += pagina) {
    const { data, error } = await sb
      .from("tax_normalization_items")
      .select(
        "id, transaction_id, client_legajo, cuit, business_name, operation_date, taxable_base, old_rate, new_rate, old_amount, new_amount, delta",
      )
      .eq("run_id", runId)
      .order("cuit")
      .order("operation_date")
      .range(desde, desde + pagina - 1);
    if (error) throw new DataAccessError(error);
    for (const r of data ?? [])
      out.push({
        id: r.id,
        transactionId: r.transaction_id,
        legajo: r.client_legajo,
        cuit: r.cuit,
        razonSocial: r.business_name,
        fecha: r.operation_date,
        base: num(r.taxable_base),
        alicuotaAnterior: num(r.old_rate),
        alicuotaNueva: num(r.new_rate),
        montoAnterior: num(r.old_amount),
        montoNuevo: num(r.new_amount),
        ajuste: num(r.delta),
      });
    if (!data || data.length < pagina) break;
  }
  return out;
}

export type ResultadoAplicar = {
  operaciones: number;
  totalAjuste: number;
  reportesRegenerados: number;
};

export async function aplicarNormalizacion(runId: string): Promise<ResultadoAplicar> {
  const r = await rpc<{
    operations: number;
    total_delta: number | string;
    filings_regenerated: number;
  }>("tax_normalization_apply", { p_run_id: runId });
  return {
    operaciones: r.operations,
    totalAjuste: num(r.total_delta),
    reportesRegenerados: r.filings_regenerated,
  };
}

export const descartarNormalizacion = (runId: string) =>
  rpc<void>("tax_normalization_discard", { p_run_id: runId });

// ============================================================================
// Presentaciones por tramo
// ============================================================================

export type ArchivoPresentacion = "Movimientos" | "Sin archivo";

export type Presentacion = {
  id: string;
  impuestoId: string;
  impuestoCodigo: string;
  periodo: string;
  tramo: 1 | 2 | 3;
  desde: string;
  hasta: string;
  vencimiento: string | null;
  archivo: ArchivoPresentacion;
  version: number;
  vigente: boolean;
  registros: number;
  totalBase: number;
  totalRetenido: number;
  generadoAt: string;
  presentadoAt: string | null;
  pagadoAt: string | null;
  referenciaPago: string | null;
};

export type ItemPresentacion = {
  id: number;
  tipo: "Retención" | "Ajuste";
  transactionId: string;
  legajo: string;
  cuit: string;
  razonSocial: string | null;
  fecha: string;
  base: number;
  alicuota: number;
  monto: number;
};

const FILING_COLUMNS =
  "id, tax_id, period, segment, segment_from, segment_to, due_date, file_type, version, status, record_count, " +
  "total_base, total_amount, generated_at, filed_at, paid_at, payment_reference, taxes(code)";

type FilingRow = {
  id: string;
  tax_id: string;
  period: string;
  segment: 1 | 2 | 3;
  segment_from: string;
  segment_to: string;
  due_date: string | null;
  file_type: "movements" | "none";
  version: number;
  status: "current" | "replaced";
  record_count: number;
  total_base: number | string;
  total_amount: number | string;
  generated_at: string;
  filed_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  taxes: { code: string } | { code: string }[] | null;
};

const toPresentacion = (r: FilingRow): Presentacion => {
  const tax = Array.isArray(r.taxes) ? r.taxes[0] : r.taxes;
  return {
    id: r.id,
    impuestoId: r.tax_id,
    impuestoCodigo: tax?.code ?? "IIBB",
    periodo: r.period,
    tramo: r.segment,
    desde: r.segment_from,
    hasta: r.segment_to,
    vencimiento: r.due_date,
    archivo: r.file_type === "movements" ? "Movimientos" : "Sin archivo",
    version: r.version,
    vigente: r.status === "current",
    registros: r.record_count,
    totalBase: num(r.total_base),
    totalRetenido: num(r.total_amount),
    generadoAt: r.generated_at,
    presentadoAt: r.filed_at,
    pagadoAt: r.paid_at,
    referenciaPago: r.payment_reference,
  };
};

export const QK_PRESENTACIONES = ["tax_filings"] as const;

export async function listPresentaciones(limite = 500): Promise<Presentacion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_filings")
    .select(FILING_COLUMNS)
    .order("generated_at", { ascending: false })
    .limit(limite);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as unknown as FilingRow[]).map(toPresentacion);
}

export async function listItemsPresentacion(
  filingId: string,
  maximo = 50000,
): Promise<ItemPresentacion[]> {
  const sb = requireSupabase();
  const out: ItemPresentacion[] = [];
  const pagina = 1000;
  for (let desde = 0; desde < maximo; desde += pagina) {
    const { data, error } = await sb
      .from("tax_filing_items")
      .select(
        "id, kind, transaction_id, client_legajo, cuit, business_name, operation_date, taxable_base, rate, amount",
      )
      .eq("filing_id", filingId)
      .order("operation_date")
      .order("id")
      .range(desde, desde + pagina - 1);
    if (error) throw new DataAccessError(error);
    for (const r of data ?? [])
      out.push({
        id: r.id,
        tipo: r.kind === "adjustment" ? "Ajuste" : "Retención",
        transactionId: r.transaction_id,
        legajo: r.client_legajo,
        cuit: r.cuit,
        razonSocial: r.business_name,
        fecha: r.operation_date,
        base: num(r.taxable_base),
        alicuota: num(r.rate),
        monto: num(r.amount),
      });
    if (!data || data.length < pagina) break;
  }
  return out;
}

/** Genera (o devuelve, si no cambio) la version del tramo. */
export const generarPresentacion = (periodo: string, tramo: 1 | 2 | 3) =>
  rpc<string>("tax_filing_generate", { p_period: periodo, p_segment: tramo });

export const marcarPresentado = (id: string, presentado: boolean) =>
  rpc<void>("tax_filing_set_filed", { p_filing_id: id, p_filed: presentado });

export const marcarPagado = (id: string, pagado: boolean, referencia?: string) =>
  rpc<void>("tax_filing_set_paid", {
    p_filing_id: id,
    p_paid: pagado,
    p_reference: referencia?.trim() || null,
  });
