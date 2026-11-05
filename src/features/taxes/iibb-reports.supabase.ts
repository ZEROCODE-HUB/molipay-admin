import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

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
  if (error) throw toAppError(error);
  return data as T;
}

const num = (v: number | string | null | undefined) => Number(v ?? 0);

// ============================================================================
// Normalizacion retroactiva
// ============================================================================

export type StatusRun = "Preview" | "Aplicada" | "Descartada";

const STATUS_RUN: Record<string, StatusRun> = {
  preview: "Preview",
  applied: "Aplicada",
  discarded: "Descartada",
};

export type RunNormalization = {
  id: string;
  padronId: string;
  periodo: string;
  desde: string;
  hasta: string;
  estado: StatusRun;
  operaciones: number;
  clientes: number;
  totalBase: number;
  totalAjuste: number;
  creadaAt: string;
  aplicadaAt: string | null;
};

export type ItemNormalization = {
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

const toRun = (r: RunRow): RunNormalization => ({
  id: r.id,
  padronId: r.registry_id,
  periodo: r.period,
  desde: r.date_from,
  hasta: r.date_to,
  estado: STATUS_RUN[r.status] ?? "Descartada",
  operaciones: r.operations_count,
  clientes: r.clients_count,
  totalBase: num(r.total_base),
  totalAjuste: num(r.total_delta),
  creadaAt: r.created_at,
  aplicadaAt: r.applied_at,
});

export const QK_NORMALIZATION = ["tax_normalization_runs"] as const;

/** Recalcula con el padron lo ya retenido en el mes en curso. No cambia nada: deja una corrida en preview. */
export async function generatePreviewNormalization(registryId: string): Promise<RunNormalization> {
  const r = await rpc<{ run_id: string }>("tax_normalization_preview", {
    p_registry_id: registryId,
  });
  return getRun(r.run_id);
}

export async function getRun(id: string): Promise<RunNormalization> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_normalization_runs")
    .select(RUN_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw toAppError(error);
  return toRun(data as RunRow);
}

/** Corridas recientes (para el historial de normalizaciones). */
export async function listRuns(limit = 20): Promise<RunNormalization[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_normalization_runs")
    .select(RUN_COLUMNS)
    .neq("status", "discarded")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return ((data ?? []) as RunRow[]).map(toRun);
}

/** Items de la corrida, de a paginas de 1000 (limite de PostgREST). */
export async function listItemsRun(runId: string, maximo = 20000): Promise<ItemNormalization[]> {
  const sb = requireSupabase();
  const out: ItemNormalization[] = [];
  const page = 1000;
  for (let from = 0; from < maximo; from += page) {
    const { data, error } = await sb
      .from("tax_normalization_items")
      .select(
        "id, transaction_id, client_legajo, cuit, business_name, operation_date, taxable_base, old_rate, new_rate, old_amount, new_amount, delta",
      )
      .eq("run_id", runId)
      .order("cuit")
      .order("operation_date")
      .range(from, from + page - 1);
    if (error) throw toAppError(error);
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
    if (!data || data.length < page) break;
  }
  return out;
}

export type ResultApply = {
  operaciones: number;
  totalAjuste: number;
  reportesRegenerados: number;
};

export async function applyNormalization(runId: string): Promise<ResultApply> {
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

export const descartarNormalization = (runId: string) =>
  rpc<void>("tax_normalization_discard", { p_run_id: runId });

// ============================================================================
// Presentaciones por tramo
// ============================================================================

export type FileFiling = "Movimientos" | "Sin archivo";

export type Filing = {
  id: string;
  impuestoId: string;
  impuestoCodigo: string;
  periodo: string;
  tramo: 1 | 2 | 3;
  desde: string;
  hasta: string;
  vencimiento: string | null;
  archivo: FileFiling;
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

export type ItemFiling = {
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

const toFiling = (r: FilingRow): Filing => {
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

export const QK_FILINGS = ["tax_filings"] as const;

export async function listFilings(limit = 500): Promise<Filing[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_filings")
    .select(FILING_COLUMNS)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return ((data ?? []) as unknown as FilingRow[]).map(toFiling);
}

export async function getFiling(id: string): Promise<Filing> {
  const { data, error } = await requireSupabase()
    .from("tax_filings")
    .select(FILING_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw toAppError(error);
  return toFiling(data as unknown as FilingRow);
}

export type SircupaRow = {
  cuit: string;
  cvu: string;
  base: number;
  monto: number;
  movimientos: number;
  crc: string;
};

/** Filas del TXT: la consolidacion por CUIT y cuenta la hace la base. */
export async function listSircupaRows(filingId: string): Promise<SircupaRow[]> {
  const rows = await rpc<
    (Omit<SircupaRow, "base" | "monto"> & { base: number | string; monto: number | string })[]
  >("tax_filing_sircupa_rows", { p_filing_id: filingId });
  return rows.map((r) => ({ ...r, base: num(r.base), monto: num(r.monto) }));
}

export async function listItemsFiling(filingId: string, maximo = 50000): Promise<ItemFiling[]> {
  const sb = requireSupabase();
  const out: ItemFiling[] = [];
  const page = 1000;
  for (let from = 0; from < maximo; from += page) {
    const { data, error } = await sb
      .from("tax_filing_items")
      .select(
        "id, kind, transaction_id, client_legajo, cuit, business_name, operation_date, taxable_base, rate, amount",
      )
      .eq("filing_id", filingId)
      .order("operation_date")
      .order("id")
      .range(from, from + page - 1);
    if (error) throw toAppError(error);
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
    if (!data || data.length < page) break;
  }
  return out;
}

/** Genera (o devuelve, si no cambio) la version del tramo. */
export const generateFiling = (period: string, tier: 1 | 2 | 3) =>
  rpc<string>("tax_filing_generate", { p_period: period, p_segment: tier });

export const markFiled = (id: string, filed: boolean) =>
  rpc<void>("tax_filing_set_filed", { p_filing_id: id, p_filed: filed });

export const markPaid = (id: string, paid: boolean, referencia?: string) =>
  rpc<void>("tax_filing_set_paid", {
    p_filing_id: id,
    p_paid: paid,
    p_reference: referencia?.trim() || null,
  });
