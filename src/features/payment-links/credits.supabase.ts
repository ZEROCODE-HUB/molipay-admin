import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type { LineSettlement } from "@/features/payment-links/settlements-parse";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";

// Capa de datos del modulo de Acreditaciones (migraciones 20261030100000..120000).
// Todo el calculo de dinero vive en la base: aca solo se llama a las RPCs y se
// leen las vistas. Ningun importe se recalcula en el navegador.

export const QK_ACRED = ["acreditaciones"] as const;

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

// ---------------------------------------------------------------------------
// Importacion del archivo de liquidaciones
// ---------------------------------------------------------------------------

export type ResultLine = "importa" | "ignora" | "excepcion" | "error";

export type LinePreview = {
  nro: number;
  fecha: string | null;
  marca: string | null;
  establecimiento: string | null;
  bruto: number | null;
  costo: number | null;
  impuestos: number | null;
  neto: number | null;
  estado: string;
  resultado: ResultLine;
  motivo: string | null;
  advertencias: string[];
  comercio_id: string | null;
  comercio: string | null;
  legajo: string | null;
};

export type TotalesFile = {
  renglones: number;
  con_importe: number;
  en_cero: number;
  excepciones: number;
  errores: number;
  advertencias: number;
  bruto: number;
  costo: number;
  impuestos: number;
  neto: number;
  desde: string | null;
  hasta: string | null;
};

export type PreviewSettlement = {
  archivo_duplicado: boolean;
  puede_confirmar: boolean;
  estado: "archivo_duplicado" | "con_errores" | "lista_para_confirmar";
  totales: TotalesFile;
  por_fecha_marca: { fecha: string; marca: string; neto: number }[];
  renglones: LinePreview[];
};

/** Renglones del parser al formato que espera la RPC (importes como texto con punto decimal). */
export function linesForRpc(lines: LineSettlement[]) {
  const n = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "x");
  return lines.map((r) => ({
    nro: r.nro,
    fecha: r.fecha,
    marca: r.marca,
    establecimiento: r.establecimiento,
    bruto: n(r.totalBruto),
    costo: n(r.costoServicio),
    impuestos: n(r.impuestos),
    neto: n(r.totalNeto),
  }));
}

/** Huella SHA-256 del contenido del archivo: bloquea importar dos veces el mismo. */
export async function huellaFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Rango "Desde: dd/mm/aaaa Hasta: dd/mm/aaaa" de la primera linea del archivo. */
export function rangeDelHeader(lines: string[]): { desde: string | null; hasta: string | null } {
  const txt = lines.join(" ");
  const iso = (m: RegExpMatchArray | null) =>
    m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
  return {
    desde: iso(txt.match(/Desde:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)),
    hasta: iso(txt.match(/Hasta:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)),
  };
}

export async function previsualizarSettlement(lines: LineSettlement[], hash: string) {
  return rpc<PreviewSettlement>("liquidacion_previsualizar", {
    p_renglones: linesForRpc(lines),
    p_archivo_hash: hash,
  });
}

export type ResultImportacion = {
  importacion_id: string;
  estado: "importada" | "importada_con_excepciones";
  lotes_creados: number;
  excepciones: number;
  en_cero: number;
  totales: TotalesFile;
};

export async function confirmSettlement(args: {
  renglones: LineSettlement[];
  archivoNombre: string;
  hash: string;
  desde: string | null;
  hasta: string | null;
}) {
  return rpc<ResultImportacion>("liquidacion_confirmar", {
    p_renglones: linesForRpc(args.renglones),
    p_archivo_nombre: args.archivoNombre,
    p_archivo_hash: args.hash,
    p_rango_desde: args.desde,
    p_rango_hasta: args.hasta,
    p_revisado: true,
    p_adquirente: "payway",
  });
}

export type Importacion = {
  id: string;
  archivo_nombre: string;
  estado: string;
  observaciones: string | null;
  rango_desde: string | null;
  rango_hasta: string | null;
  created_at: string;
  resumen: {
    lotes_creados?: number;
    excepciones?: number;
    en_cero?: number;
    totales?: TotalesFile;
  } | null;
};

export async function listImportaciones(limit = 20): Promise<Importacion[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("liquidaciones_importaciones")
    .select(
      "id, archivo_nombre, estado, observaciones, rango_desde, rango_hasta, created_at, resumen",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as Importacion[];
}

// ---------------------------------------------------------------------------
// Excepciones de importacion
// ---------------------------------------------------------------------------

export const KIND_EXCEPCION_LABEL: Record<string, string> = {
  excepcion_sin_establecimiento: "Establecimiento sin comercio",
  excepcion_comercio_inactivo: "Comercio inactivo",
  excepcion_diferencia: "Diferencia con ventas",
  excepcion_duplicado: "Posible duplicado",
  excepcion_sin_lote: "Sin lote",
  diferencia_ventas: "Diferencia con ventas",
  descartado_no_corresponde: "No corresponde a MoliPay",
  aplicado: "Resuelta",
};

export type Excepcion = {
  id: string;
  importacion_id: string;
  nro_renglon: number;
  fecha: string;
  marca: string;
  establecimiento: string;
  total_bruto: number;
  total_neto: number;
  estado: string;
  motivo_excepcion: string | null;
  advertencias: string[];
  excepcion_estado: "abierta" | "resuelta" | "descartada" | null;
  resolucion_motivo: string | null;
  resuelto_at: string | null;
  comercio_id: string | null;
  lote_acreditacion_id: string | null;
  created_at: string;
  importacion: { archivo_nombre: string } | null;
  /** "excepcion" (bloquea) o "aviso" (renglon importado con advertencia). */
  clase: "excepcion" | "aviso";
  tipo: string;
};

export async function listExcepciones(filters: {
  estado?: "abierta" | "resuelta" | "descartada" | "todas";
}) {
  const sb = requireSupabase();
  const cols =
    "id, importacion_id, nro_renglon, fecha, marca, establecimiento, total_bruto, total_neto, estado, motivo_excepcion, advertencias, excepcion_estado, resolucion_motivo, resuelto_at, comercio_id, lote_acreditacion_id, created_at, importacion:liquidaciones_importaciones(archivo_nombre)";

  let q1 = sb.from("liquidaciones_renglones").select(cols).not("excepcion_estado", "is", null);
  if (filters.estado && filters.estado !== "todas") q1 = q1.eq("excepcion_estado", filters.estado);
  const q2 = sb
    .from("liquidaciones_renglones")
    .select(cols)
    .contains("advertencias", ["diferencia_ventas"]);

  const [a, b] = await Promise.all([
    q1.order("fecha", { ascending: false }).limit(1000),
    q2.limit(1000),
  ]);
  if (a.error) throw toAppError(a.error);
  if (b.error) throw toAppError(b.error);

  const excepciones: Excepcion[] = ((a.data ?? []) as unknown as Excepcion[]).map((r) => ({
    ...r,
    clase: "excepcion",
    tipo: r.estado,
  }));
  const incluirNotices =
    !filters.estado || filters.estado === "abierta" || filters.estado === "todas";
  const notices: Excepcion[] = incluirNotices
    ? ((b.data ?? []) as unknown as Excepcion[]).map((r) => ({
        ...r,
        clase: "aviso",
        tipo: "diferencia_ventas",
      }))
    : [];
  return [...excepciones, ...notices];
}

export async function resolverExcepciones(args: {
  ids: string[];
  accion: "asignar" | "no_corresponde" | "aceptar";
  comercioId?: string | null;
  motivo?: string | null;
}) {
  return rpc<{ resueltos: number; lotes_creados: string[] }>("liquidacion_resolver_excepciones", {
    p_renglon_ids: args.ids,
    p_accion: args.accion,
    p_comercio_id: args.comercioId ?? null,
    p_motivo: args.motivo ?? null,
  });
}

// ---------------------------------------------------------------------------
// Conciliacion y acreditaciones por dia
// ---------------------------------------------------------------------------

export type DayCredit = {
  fecha: string;
  comercios: number;
  lotes: number;
  neto_payway: number;
  ingresado: number | null;
  diferencia: number | null;
  excepciones: number;
  descuentos: number;
  compensaciones: number;
  neto_a_acreditar: number;
  acreditado: number;
  pendiente: number;
  estado: "Con excepciones" | "No conciliado" | "Listo" | "Acreditado parcial" | "Acreditado";
};

export async function creditsByDay(from: string, to: string, merchantId?: string | null) {
  return rpc<DayCredit[]>("acreditaciones_por_dia", {
    p_desde: from,
    p_hasta: to,
    p_comercio_id: merchantId ?? null,
  });
}

export type ReconciliationBrand = {
  marca: string;
  neto_archivo: number;
  lotes: number;
  sin_conciliar: number;
  ultima: {
    ingresado: number;
    estado: "conciliado" | "con_diferencia";
    created_at: string;
    diferencia: number;
  } | null;
};

/** Neto del archivo por marca para una fecha de pago, con la ultima conciliacion. */
export async function reconciliationDelDay(date: string): Promise<ReconciliationBrand[]> {
  const sb = requireSupabase();
  const [batches, exc, conc] = await Promise.all([
    sb
      .from("lotes_acreditacion")
      .select("marca_norm, neto_payway, conciliado")
      .eq("origen", "archivo")
      .eq("legacy", false)
      .eq("fecha", date),
    sb
      .from("liquidaciones_renglones")
      .select("marca_norm, total_neto")
      .eq("excepcion_estado", "abierta")
      .eq("fecha", date),
    sb
      .from("liquidacion_conciliaciones")
      .select("marca_norm, ingresado, estado, created_at, diferencia")
      .eq("fecha_pago", date)
      .order("created_at", { ascending: false }),
  ]);
  for (const r of [batches, exc, conc]) if (r.error) throw toAppError(r.error);

  const m = new Map<string, ReconciliationBrand>();
  const get = (k: string) => {
    const key = k || "SIN MARCA";
    if (!m.has(key))
      m.set(key, { marca: key, neto_archivo: 0, lotes: 0, sin_conciliar: 0, ultima: null });
    return m.get(key)!;
  };
  for (const l of (batches.data ?? []) as {
    marca_norm: string;
    neto_payway: number;
    conciliado: boolean;
  }[]) {
    const g = get(l.marca_norm);
    g.neto_archivo += num(l.neto_payway);
    g.lotes += 1;
    if (!l.conciliado) g.sin_conciliar += 1;
  }
  for (const r of (exc.data ?? []) as { marca_norm: string; total_neto: number }[])
    get(r.marca_norm).neto_archivo += num(r.total_neto);
  for (const c of (conc.data ?? []) as {
    marca_norm: string;
    ingresado: number;
    estado: "conciliado" | "con_diferencia";
    created_at: string;
    diferencia: number;
  }[]) {
    const g = get(c.marca_norm);
    if (!g.ultima)
      g.ultima = {
        ingresado: num(c.ingresado),
        estado: c.estado,
        created_at: c.created_at,
        diferencia: num(c.diferencia),
      };
  }
  return [...m.values()].map((g) => ({
    ...g,
    neto_archivo: Math.round(g.neto_archivo * 100) / 100,
  }));
}

export async function conciliar(date: string, brand: string, ingresado: number, notes?: string) {
  return rpc<{
    conciliacion_id: string;
    estado: "conciliado" | "con_diferencia";
    neto_archivo: number;
    ingresado: number;
    diferencia: number;
    lotes_conciliados: number;
  }>("liquidacion_conciliar", {
    p_fecha_pago: date,
    p_marca: brand,
    p_ingresado: ingresado,
    p_notas: notes ?? null,
  });
}

// ---------------------------------------------------------------------------
// Lotes de acreditacion
// ---------------------------------------------------------------------------

export type Subestado =
  | "listo"
  | "negativo"
  | "no_conciliado"
  | "sin_tasa"
  | "sin_calcular"
  | "comercio_inactivo"
  | "acreditado"
  | "programado"
  | "liquidado"
  | "legacy"
  | string;

export type TaxAplicado = {
  asignacion_id: string;
  impuesto_id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  alicuota: number | null;
  base: number | null;
  base_modo: string;
  aplica_a: string;
  monto: number;
  nota: string | null;
  fuente?: string | null;
};

export type BatchV2 = {
  id: string;
  codigo: string;
  comercio_id: string;
  comercio_nombre: string | null;
  comercio_legajo: string;
  comercio_usuario: string;
  bandera: string;
  fecha: string;
  estado: string;
  origen: "venta" | "archivo";
  legacy: boolean;
  establecimiento: string | null;
  marca_norm: string | null;
  cantidad_operaciones: number;
  importe_bruto: number;
  costo_servicio_payway: number | null;
  impuestos_payway: number | null;
  neto_payway: number | null;
  tasa_molipay_pct: number;
  tasa_molipay_monto: number;
  iva_tasa_monto: number | null;
  comision_cierre_lote_pct: number | null;
  comision_cierre_lote_monto: number | null;
  comision_cierre_base: string | null;
  impuestos: number;
  impuestos_detalle: TaxAplicado[];
  retencion_contracargos: number;
  retencion_pendiente?: number;
  compensacion_adelantos: number;
  recuperacion_deuda: number;
  neto_a_acreditar: number | null;
  importe_neto: number;
  conciliado: boolean;
  es_negativo: boolean;
  calculado_at: string | null;
  fecha_acreditacion: string | null;
  fecha_resolucion: string | null;
  ejecucion_id: string | null;
  acreditado_tx_id: string | null;
  importacion_id: string | null;
  importacion_archivo: string | null;
  liquidado_en_lote_id: string | null;
  subestado: Subestado;
  motivo_no_elegible: string | null;
  elegible: boolean;
  contracargos: number;
  created_at: string;
};

export const SUBESTADO_LABEL: Record<string, string> = {
  listo: "Listo",
  negativo: "Negativo",
  no_conciliado: "No conciliado",
  sin_tasa: "Sin tasa",
  sin_calcular: "Sin calcular",
  comercio_inactivo: "Comercio inactivo",
  acreditado: "Acreditado",
  programado: "Programado",
  liquidado: "Liquidado",
  legacy: "Histórico",
};

export type BatchesFilters = {
  desde?: string;
  hasta?: string;
  /** Filtra por fecha de acreditacion si el lote ya se acredito; si no, por fecha de pago. */
  fechaEfectiva?: boolean;
  comercioId?: string;
  bandera?: string;
  estado?: string;
  subestado?: string;
  origen?: "venta" | "archivo" | "todos";
  incluirLegacy?: boolean;
  soloNegativos?: boolean;
  soloContracargo?: boolean;
  importacionId?: string;
  search?: string;
  ids?: string[];
};

export async function listBatchesV2(f: BatchesFilters, page = 0, pageSize = 50) {
  const sb = requireSupabase();
  let q = sb.from("v_lotes_acreditacion").select("*", { count: "exact" });
  if (f.ids?.length) q = q.in("id", f.ids);
  if (f.fechaEfectiva && f.desde && f.hasta) {
    // Acreditados por su fecha de acreditacion; el resto por la fecha de pago (igual que resumen_acreditaciones).
    q = q.or(
      `and(fecha_acreditacion.gte.${f.desde},fecha_acreditacion.lte.${f.hasta}),and(fecha_acreditacion.is.null,fecha.gte.${f.desde},fecha.lte.${f.hasta})`,
    );
  } else {
    if (f.desde) q = q.gte("fecha", f.desde);
    if (f.hasta) q = q.lte("fecha", f.hasta);
  }
  if (f.comercioId) q = q.eq("comercio_id", f.comercioId);
  if (f.bandera) q = q.ilike("bandera", f.bandera);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.subestado) q = q.eq("subestado", f.subestado);
  if (f.origen && f.origen !== "todos") q = q.eq("origen", f.origen);
  if (!f.incluirLegacy) q = q.eq("legacy", false);
  if (f.soloNegativos) q = q.eq("es_negativo", true);
  if (f.soloContracargo) q = q.gt("contracargos", 0);
  if (f.importacionId) q = q.eq("importacion_id", f.importacionId);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%_,()]/g, " ");
    q = q.or(
      `codigo.ilike.%${s}%,comercio_nombre.ilike.%${s}%,comercio_legajo.ilike.%${s}%,establecimiento.ilike.%${s}%`,
    );
  }
  const { data, error, count } = await q
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw toAppError(error);
  return { rows: (data ?? []) as BatchV2[], total: count ?? 0 };
}

/** Totales del filtro completo (no solo la pagina). */
export async function totalesBatches(f: BatchesFilters) {
  const sb = requireSupabase();
  let q = sb
    .from("v_lotes_acreditacion")
    .select(
      "id, importe_bruto, neto_payway, tasa_molipay_monto, iva_tasa_monto, comision_cierre_lote_monto, impuestos, retencion_contracargos, compensacion_adelantos, recuperacion_deuda, neto_a_acreditar, importe_neto, origen, elegible, es_negativo",
    );
  if (f.ids?.length) q = q.in("id", f.ids);
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", f.hasta);
  if (f.comercioId) q = q.eq("comercio_id", f.comercioId);
  if (f.bandera) q = q.ilike("bandera", f.bandera);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.subestado) q = q.eq("subestado", f.subestado);
  if (f.origen && f.origen !== "todos") q = q.eq("origen", f.origen);
  if (!f.incluirLegacy) q = q.eq("legacy", false);
  if (f.soloNegativos) q = q.eq("es_negativo", true);
  if (f.soloContracargo) q = q.gt("contracargos", 0);
  if (f.importacionId) q = q.eq("importacion_id", f.importacionId);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%_,()]/g, " ");
    q = q.or(
      `codigo.ilike.%${s}%,comercio_nombre.ilike.%${s}%,comercio_legajo.ilike.%${s}%,establecimiento.ilike.%${s}%`,
    );
  }
  const { data, error } = await q.limit(10000);
  if (error) throw toAppError(error);
  const rows = (data ?? []) as Partial<BatchV2>[];
  const s = (fn: (r: Partial<BatchV2>) => number) =>
    Math.round(rows.reduce((a, r) => a + fn(r), 0) * 100) / 100;
  return {
    lotes: rows.length,
    bruto: s((r) => num(r.importe_bruto)),
    netoPayway: s((r) => num(r.neto_payway)),
    descuentos: s(
      (r) =>
        num(r.tasa_molipay_monto) +
        num(r.iva_tasa_monto) +
        num(r.comision_cierre_lote_monto) +
        num(r.impuestos),
    ),
    compensaciones: s(
      (r) =>
        num(r.retencion_contracargos) + num(r.compensacion_adelantos) + num(r.recuperacion_deuda),
    ),
    netoAcreditar: s((r) =>
      r.origen === "archivo" ? num(r.neto_a_acreditar) : num(r.importe_neto),
    ),
    elegiblesIds: rows.filter((r) => r.elegible).map((r) => String(r.id)),
    negativos: rows.filter((r) => r.es_negativo).length,
  };
}

export async function getBatchV2(id: string): Promise<BatchV2 | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_lotes_acreditacion")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return (data as BatchV2) ?? null;
}

export type SaleDeBatch = {
  id: string;
  id_txn: string;
  fecha: string;
  monto_operacion: number;
  comision: number;
  bandera: string | null;
  cuotas: number | null;
  site_transaction_id: string | null;
};

export async function salesDeBatch(batchId: string): Promise<SaleDeBatch[]> {
  // RPC del backoffice: no depende de la RLS de lote_movimientos.
  return rpc<SaleDeBatch[]>("lote_ventas", { p_lote_id: batchId });
}

export async function recalcularBatch(id: string) {
  return rpc<Record<string, unknown>>("lote_recalcular", { p_lote_id: id });
}

// ---------------------------------------------------------------------------
// Revision y ejecucion
// ---------------------------------------------------------------------------

export type Recaudadora = {
  saldo_conciliado: number;
  pendiente_acreditar: number;
  adelantos_sin_compensar: number;
  deuda_comercios: number;
  disponible_adelantos: number;
  ultimo_corte: string | null;
};

export async function statusRecaudadora() {
  return rpc<Recaudadora>("recaudadora_estado");
}

export type CalculoBatch = {
  lote_id: string;
  comercio_id: string;
  codigo: string;
  bandera: string;
  fecha_pago: string;
  bruto: number;
  subestado: string;
  neto_payway: number;
  tasa_definida: boolean;
  tasa_pct: number;
  tasa_monto: number;
  iva_pct: number;
  iva_tasa_monto: number;
  cierre_pct: number;
  cierre_base: string;
  cierre_monto: number;
  cierre_base_monto?: number;
  impuestos: TaxAplicado[];
  impuestos_monto: number;
  retencion_contracargos?: number;
  compensacion_adelantos: number;
  recuperacion_deuda: number;
  neto_a_acreditar: number;
  hash: string;
};

export type RevisionMerchant = {
  comercio_id: string;
  comercio: string;
  legajo: string;
  lotes: number;
  banderas: string[];
  neto_payway: number;
  tasa: number;
  iva_tasa: number;
  cierre: number;
  impuestos: number;
  compensacion_adelantos: number;
  recuperacion_deuda: number;
  neto_a_acreditar: number;
  saldo_actual: number;
  saldo_despues: number;
  deuda_actual: number;
};

export type Revision = {
  lotes: CalculoBatch[];
  omitidos: { lote_id: string; codigo: string; motivo: string }[];
  comercios: RevisionMerchant[];
  totales: {
    lotes: number;
    comercios: number;
    bruto: number;
    neto_payway: number;
    tasa: number;
    iva_tasa: number;
    cierre: number;
    impuestos: number;
    compensacion_adelantos: number;
    recuperacion_deuda: number;
    neto_a_acreditar: number;
    lotes_negativos: number;
    negativos_monto: number;
  };
  recaudadora: Recaudadora;
  alcanza: boolean;
};

export async function revisarCredit(ids: string[]) {
  return rpc<Revision>("acreditacion_revisar", { p_lote_ids: ids });
}

export type ResultExecution = {
  ejecucion_id: string;
  acreditados: number;
  errores: number;
  omitidos: number;
  neto_acreditado: number;
  items: {
    lote_id: string;
    resultado: "acreditado" | "error" | "omitido";
    motivo?: string;
    neto_a_acreditar?: number;
    transaction_id?: string;
  }[];
};

export async function runCredit(args: {
  ids: string[];
  fecha: string;
  confirmaciones: { totales: boolean; compensaciones: boolean; irreversible: boolean };
  texto: string;
  hashes?: Record<string, string>;
}) {
  return rpc<ResultExecution>("acreditacion_ejecutar", {
    p_lote_ids: args.ids,
    p_fecha: args.fecha,
    p_confirmaciones: args.confirmaciones,
    p_texto: args.texto,
    p_hashes: args.hashes ?? null,
  });
}

export type Execution = {
  id: string;
  numero: number;
  estado: "en_curso" | "completada" | "completada_con_errores";
  fecha_acreditacion: string;
  totales: {
    lotes?: number;
    acreditados?: number;
    errores?: number;
    omitidos?: number;
    neto_acreditado?: number;
  };
  ejecutado_by: string | null;
  created_at: string;
  finalizado_at: string | null;
};

export async function listExecutions(limit = 50): Promise<Execution[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("acreditacion_ejecuciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as Execution[];
}

export type ExecutionItem = {
  id: string;
  lote_id: string;
  neto_acreditar: number | null;
  resultado: "acreditado" | "error" | "omitido";
  motivo: string | null;
  transaction_id: string | null;
  lote: { codigo: string; bandera: string; fecha: string; comercio_id: string } | null;
};

export async function itemsDeExecution(executionId: string): Promise<ExecutionItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("acreditacion_ejecucion_items")
    .select(
      "id, lote_id, neto_acreditar, resultado, motivo, transaction_id, lote:lotes_acreditacion(codigo, bandera, fecha, comercio_id)",
    )
    .eq("ejecucion_id", executionId)
    .order("created_at");
  if (error) throw toAppError(error);
  return (data ?? []) as unknown as ExecutionItem[];
}

// Seleccion que se pasa de un listado a la ejecucion masiva. Es comodidad de
// navegacion: si no esta (otra pestaña, modo privado), el paso 1 arranca vacio.
const selectionStore = createKeyValueStore<string[]>({
  key: "molipay.acreditacion.seleccion",
  storage: "session",
  validate: (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string"),
});

export function saveSelection(ids: string[]) {
  selectionStore.set(ids.map(String));
}

export function limpiarSelection() {
  selectionStore.remove();
}

export function readSelection(): string[] {
  return selectionStore.get() ?? [];
}

// ---------------------------------------------------------------------------
// Adelantos (v2)
// ---------------------------------------------------------------------------

export type AdvanceV2 = {
  id: string;
  comercio_id: string;
  comercio_nombre: string | null;
  comercio_legajo: string;
  monto_solicitado: number;
  monto_ofertado: number | null;
  tasa_interes_pct: number | null;
  descuento: number | null;
  neto_a_recibir: number | null;
  plazo_adelantado_dias: number;
  tope_al_solicitar: number | null;
  estado: string;
  estado_etiqueta: string;
  modelo: "legacy" | "v2";
  motivo: string | null;
  rechazo_motivo: string | null;
  fecha_solicitud: string;
  ofertado_at: string | null;
  aceptado_at: string | null;
  fecha_acreditacion: string | null;
  compensado: number;
  pendiente_compensar: number;
  resuelto_por: string | null;
  ofertado_by: string | null;
  created_at: string;
};

/** Adelantos que esperan al backoffice: Solicitados (ofertar) y Aceptados (acreditar). */
export async function countAdvancesNeedingAction(): Promise<number> {
  const { count, error } = await requireSupabase()
    .from("adelantos")
    .select("id", { count: "exact", head: true })
    .eq("modelo", "v2")
    .in("estado", ["Pendiente", "Aceptado"]);
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function listAdvancesV2(f: {
  estado?: string;
  comercioId?: string;
  desde?: string;
  hasta?: string;
  conPendiente?: boolean;
}) {
  const sb = requireSupabase();
  let q = sb.from("v_adelantos").select("*");
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.comercioId) q = q.eq("comercio_id", f.comercioId);
  if (f.desde) q = q.gte("fecha_solicitud", f.desde);
  if (f.hasta) q = q.lte("fecha_solicitud", `${f.hasta}T23:59:59`);
  if (f.conPendiente) q = q.gt("pendiente_compensar", 0);
  const { data, error } = await q.order("fecha_solicitud", { ascending: false }).limit(1000);
  if (error) throw toAppError(error);
  return (data ?? []) as AdvanceV2[];
}

export type CapAdvance = {
  comercio_id: string;
  vendido_no_acreditado: number;
  adelantos_vigentes: number;
  tope: number;
  antiguedad_dias: number | null;
  antiguedad_minima_dias: number;
  cumple_antiguedad: boolean;
  deuda_pendiente: number;
  adelantos_sin_compensar: number;
};

export async function capAdvance(merchantId: string, excluirAdvance?: string) {
  return rpc<CapAdvance>("adelanto_tope", {
    p_comercio_id: merchantId,
    p_excluir_adelanto: excluirAdvance ?? null,
  });
}

/** Venta con tarjeta del comercio en los ultimos N dias (dato para evaluar el adelanto). */
export async function salesLastsDays(merchantId: string, days = 90) {
  const sb = requireSupabase();
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("transactions")
    .select("monto_operacion")
    .eq("comercio_id", merchantId)
    .eq("tipo", "tarjeta")
    .gte("fecha", from)
    .limit(10000);
  if (error) throw toAppError(error);
  const rows = (data ?? []) as { monto_operacion: number }[];
  return {
    cantidad: rows.length,
    bruto: Math.round(rows.reduce((a, r) => a + num(r.monto_operacion), 0) * 100) / 100,
  };
}

export async function ofertarAdvance(
  id: string,
  amount: number,
  ratePct: number,
  plazoDays: number,
) {
  return rpc<{
    descuento: number;
    neto_a_recibir: number;
    alcanza: boolean;
    disponible_recaudadora: number;
  }>("adelanto_ofertar", {
    p_adelanto_id: id,
    p_monto: amount,
    p_tasa_pct: ratePct,
    p_plazo_dias: plazoDays,
  });
}

export async function rechazarAdvance(id: string, reason: string) {
  return rpc<unknown>("adelanto_rechazar", { p_adelanto_id: id, p_motivo: reason });
}

export async function creditAdvanceV2(id: string) {
  return rpc<{ transaction_id: string; neto_depositado: number }>("adelanto_acreditar", {
    p_adelanto_id: id,
  });
}

export type CompensacionAdvance = {
  id: string;
  lote_id: string;
  monto: number;
  created_at: string;
  lote: { codigo: string } | null;
};

export async function compensacionesDeAdvance(id: string): Promise<CompensacionAdvance[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("adelanto_compensaciones")
    .select("id, lote_id, monto, created_at, lote:lotes_acreditacion(codigo)")
    .eq("adelanto_id", id)
    .order("created_at");
  if (error) throw toAppError(error);
  return (data ?? []) as unknown as CompensacionAdvance[];
}

// ---------------------------------------------------------------------------
// Contracargos
// ---------------------------------------------------------------------------

export type ChargebackRecupero = {
  id: string;
  comercio_id: string | null;
  comercio_nombre: string | null;
  importe: number;
  estado: string;
  marca_tarjeta: string | null;
  site_id: string | null;
  motivo_payway: string | null;
  ticket_payway: string | null;
  movimiento_id: string | null;
  fecha_transaccion: string | null;
  lote_descuento_id: string | null;
  lote_descuento_codigo: string | null;
  lote_descuento_fecha: string | null;
  lote_descuento_estado: string | null;
  estado_recupero:
    | "Sin liquidar"
    | "Por descontar"
    | "Descontado"
    | "Pendiente de recuperar"
    | "Recuperado"
    | "Retención programada"
    | "Retenido"
    | "Liberado";
  retencion_estado: "no_aplica" | "pendiente" | "retenido" | "aplicado_payway" | "liberado";
  retenido_monto: number;
  lote_venta_codigo: string | null;
  lote_venta_estado: string | null;
  retencion_lote_codigo: string | null;
  deuda_monto: number | null;
  deuda_recuperado: number | null;
  pendiente_recuperar: number;
  es_simulacion: boolean;
  created_at: string;
};

/** Descuento y recupero de un contracargo (vista v_contracargos_recupero). */
export async function getChargebackRecupero(id: string): Promise<ChargebackRecupero | null> {
  const { data, error } = await requireSupabase()
    .from("v_contracargos_recupero")
    .select(
      "id, comercio_id, comercio_nombre, importe, estado, marca_tarjeta, site_id, motivo_payway, ticket_payway, movimiento_id, fecha_transaccion, lote_descuento_id, lote_descuento_codigo, lote_descuento_fecha, lote_descuento_estado, estado_recupero, deuda_monto, deuda_recuperado, pendiente_recuperar, es_simulacion, created_at, retencion_estado, retenido_monto, lote_venta_codigo, lote_venta_estado, retencion_lote_codigo",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return (data as ChargebackRecupero | null) ?? null;
}

export async function listChargebacksRecupero(): Promise<ChargebackRecupero[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_contracargos_recupero")
    .select(
      "id, comercio_id, comercio_nombre, importe, estado, marca_tarjeta, site_id, motivo_payway, ticket_payway, movimiento_id, fecha_transaccion, lote_descuento_id, lote_descuento_codigo, lote_descuento_fecha, lote_descuento_estado, estado_recupero, deuda_monto, deuda_recuperado, pendiente_recuperar, es_simulacion, created_at, retencion_estado, retenido_monto, lote_venta_codigo, lote_venta_estado, retencion_lote_codigo",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw toAppError(error);
  return (data ?? []) as ChargebackRecupero[];
}

export async function registrarChargeback(
  transactionId: string,
  amount: number,
  ticket?: string,
  reason?: string,
) {
  return rpc<{ contracargo_id: string }>("contracargo_registrar", {
    p_transaction_id: transactionId,
    p_importe: amount,
    p_ticket: ticket ?? null,
    p_motivo: reason ?? null,
  });
}

export async function changeStatusChargeback(id: string, status: string, nota?: string) {
  return rpc<unknown>("contracargo_cambiar_estado", {
    p_contracargo_id: id,
    p_estado: status,
    p_nota: nota ?? null,
  });
}

// ---------------------------------------------------------------------------
// Lecturas generales
// ---------------------------------------------------------------------------

export type BatchDelDay = {
  id: string;
  codigo: string;
  fecha: string;
  bandera: string;
  comercio_id: string;
  comercio: string;
  legajo: string;
  origen: "venta" | "archivo";
  estado: string;
  legacy: boolean;
  cantidad_operaciones: number;
  bruto: number;
  neto: number;
  fecha_acreditacion: string | null;
  estado_dia: "acreditado" | "pendiente" | "programado" | "vencido";
  elegible: boolean;
  motivo: string | null;
};

export type DetailDayCalendario = {
  fecha: string;
  hoy: string;
  lotes: BatchDelDay[];
  actividad: {
    acreditaciones: {
      id: string;
      codigo: string;
      fecha: string;
      bandera: string;
      comercio: string;
      legajo: string;
      neto: number;
      hora: string | null;
    }[];
    adelantos: {
      id: string;
      comercio: string;
      legajo: string;
      monto: number;
      neto: number | null;
      estado: string;
    }[];
    importaciones: {
      id: string;
      archivo: string;
      hora: string;
      lotes: number | null;
      excepciones: number | null;
    }[];
  };
};

/** Lo que pasa en un dia del calendario: lotes de la celda y actividad del dia. */
export async function calendarioDayDetail(date: string, merchantId?: string | null) {
  return rpc<DetailDayCalendario>("calendario_dia_detalle", {
    p_fecha: date,
    p_comercio_id: merchantId ?? null,
  });
}

export type DayCalendario = {
  fecha: string;
  no_habil: boolean;
  programado: number;
  pendiente: number;
  acreditado: number;
  vencido: number;
  vencidas: number;
  total: number;
};

export async function calendarioV3(from: string, to: string, merchantId?: string | null) {
  return rpc<{ desde: string; hasta: string; hoy: string; dias: DayCalendario[] }>(
    "calendario_acreditaciones_v3",
    {
      p_desde: from,
      p_hasta: to,
      p_comercio_id: merchantId ?? null,
    },
  );
}

export type SummaryCredits = {
  periodo: { desde: string; hasta: string };
  ventas: { bruto: number; cantidad: number; rechazos: number };
  liquidado: { bruto: number; costo_servicio: number; impuestos: number; neto: number };
  descuentos: { tasa: number; iva_tasa: number; cierre: number; impuestos?: number; total: number };
  adelantos: {
    por_evaluar: number;
    acreditados_periodo: number;
    compensados_periodo: number;
    pendiente_compensar: number;
  };
  contracargos: { del_periodo: number; pendiente_recuperar: number; comercios_con_deuda: number };
  por_acreditar: {
    programado: number;
    no_conciliado: number;
    listo: number;
    sin_identificar: number;
  };
  acreditado: { neto: number; lotes: number; comercios: number };
  recaudadora: Recaudadora;
  alertas: {
    liquidacion_hoy_sin_cargar: boolean;
    excepciones_abiertas: number;
    vencidas: number;
    diferencias_conciliacion: number;
    recaudadora_no_cubre: boolean;
  };
  semaforo: "verde" | "amarillo" | "rojo";
};

export async function summaryCredits(from: string, to: string, merchantId?: string | null) {
  return rpc<SummaryCredits>("resumen_acreditaciones", {
    p_desde: from,
    p_hasta: to,
    p_comercio_id: merchantId ?? null,
  });
}

export type SaleDay = {
  comercio_id: string;
  fecha: string;
  comercio_nombre: string | null;
  comercio_legajo: string;
  ventas: number;
  rechazos: number;
  bruto: number;
  por_bandera: Record<string, number>;
  proxima_acreditacion: string | null;
  liquidado: number;
  pendiente_liquidar: number;
  estado: "Abierto" | "Cerrado" | "Liquidado parcial" | "Liquidado";
};

export async function listSalesDay(f: {
  desde?: string;
  hasta?: string;
  comercioId?: string;
  estado?: string;
}) {
  const sb = requireSupabase();
  let q = sb.from("v_lotes_venta_dia").select("*");
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", f.hasta);
  if (f.comercioId) q = q.eq("comercio_id", f.comercioId);
  if (f.estado) q = q.eq("estado", f.estado);
  const { data, error } = await q.order("fecha", { ascending: false }).limit(2000);
  if (error) throw toAppError(error);
  return (data ?? []) as SaleDay[];
}

/** Lotes de venta (comercio + dia) paginados en la base, con busqueda por comercio. */
export async function listSalesDayPaginado(f: {
  desde?: string;
  hasta?: string;
  comercioId?: string;
  bandera?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const sb = requireSupabase();
  let q = sb.from("v_lotes_venta_dia").select("*", { count: "exact" });
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", f.hasta);
  if (f.comercioId) q = q.eq("comercio_id", f.comercioId);
  // La bandera es una clave del jsonb por_bandera (puede tener espacios: va entre comillas).
  if (f.bandera) q = q.not(`por_bandera->>"${f.bandera.replace(/"/g, "")}"`, "is", null);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%_,()]/g, " ");
    q = q.or(`comercio_nombre.ilike.%${s}%,comercio_legajo.ilike.%${s}%`);
  }
  const { data, error, count } = await q
    .order("fecha", { ascending: false })
    .range(f.page * f.pageSize, f.page * f.pageSize + f.pageSize - 1);
  if (error) throw toAppError(error);
  return { rows: (data ?? []) as SaleDay[], total: count ?? 0 };
}

export type SaleDetail = {
  id: string;
  id_txn: string;
  fecha: string;
  monto_operacion: number;
  bandera: string | null;
  cuotas: number | null;
  lote: { id: string; codigo: string; estado: string; fecha: string; origen: string } | null;
};

/** Ventas de un comercio en un dia (hora de Argentina) con el lote donde se cobran. */
export async function salesDelDay(merchantId: string, date: string): Promise<SaleDetail[]> {
  const sb = requireSupabase();
  const from = new Date(`${date}T00:00:00-03:00`).toISOString();
  const to = new Date(`${date}T23:59:59.999-03:00`).toISOString();
  const { data, error } = await sb
    .from("transactions")
    .select("id, id_txn, fecha, monto_operacion, bandera, cuotas")
    .eq("comercio_id", merchantId)
    .eq("tipo", "tarjeta")
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha");
  if (error) throw toAppError(error);
  const sales = (data ?? []) as Omit<SaleDetail, "lote">[];
  if (sales.length === 0) return [];
  const { data: lm, error: e2 } = await sb
    .from("lote_movimientos")
    .select("movimiento_id, lote:lotes_acreditacion(id, codigo, estado, fecha, origen)")
    .in(
      "movimiento_id",
      sales.map((v) => v.id),
    );
  if (e2) throw toAppError(e2);
  const bySale = new Map<string, SaleDetail["lote"]>();
  for (const r of (lm ?? []) as unknown as { movimiento_id: string; lote: SaleDetail["lote"] }[]) {
    const prev = bySale.get(r.movimiento_id);
    // Prioridad: el lote del archivo (donde se cobro) sobre la proyeccion.
    if (!prev || (r.lote?.origen === "archivo" && prev.origen !== "archivo"))
      bySale.set(r.movimiento_id, r.lote);
  }
  return sales.map((v) => ({ ...v, lote: bySale.get(v.id) ?? null }));
}

// ---------------------------------------------------------------------------
// Parametros
// ---------------------------------------------------------------------------

export type ParameterCredit = {
  clave: string;
  valor: string;
  descripcion: string | null;
  updated_at: string | null;
};

export const PARAMETERS_CREDIT = [
  "comision_cierre_lote_pct",
  "iva_sobre_tasa_molipay_pct",
  "iva_cierre_lote_incluido_pct",
  "impuestos_link_base",
  "liquidacion_tolerancia_centavos",
  "adelanto_antiguedad_min_dias",
  "bloquear_retiros_con_deuda",
  "hora_corte_ventas",
] as const;

export async function listParametersCredit(): Promise<ParameterCredit[]> {
  // parametros_globales tiene RLS sin politica de lectura: se lee por RPC.
  return rpc<ParameterCredit[]>("acreditacion_leer_parametros");
}

/** Establecimiento para el CSV de prueba de un lote (tabla de establecimientos o site_id del comercio). */
export async function establishmentDeBatch(batchId: string) {
  return rpc<{
    establecimiento: string | null;
    origen: "establecimientos" | "site_id" | null;
    site_id: string | null;
  }>("lote_establecimiento", { p_lote_id: batchId });
}

export async function saveParameterCredit(key: string, value: string) {
  return rpc<{ clave: string; valor: string }>("acreditacion_guardar_parametro", {
    p_clave: key,
    p_valor: value,
  });
}

export type ChangeParameter = {
  id: string;
  clave: string;
  valor_anterior: string | null;
  valor_nuevo: string;
  cambiado_by: string | null;
  cambiado_at: string;
  admin: { nombre: string | null; email: string | null } | null;
};

export async function historyParameters(limit = 50): Promise<ChangeParameter[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("parametros_historial")
    .select("id, clave, valor_anterior, valor_nuevo, cambiado_by, cambiado_at")
    .order("cambiado_at", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return ((data ?? []) as Omit<ChangeParameter, "admin">[]).map((r) => ({ ...r, admin: null }));
}

// ---------------------------------------------------------------------------
// Control de saldos: cada saldo contra el ledger y contra su detalle
// ---------------------------------------------------------------------------

export type BalanceCheck = {
  ok: boolean;
  revisado_at: string;
  subcuentas: {
    subcuenta_id: string;
    legajo: string;
    nombre: string;
    disponible: number;
    disponible_ledger: number;
    retenido: number;
    retenido_ledger: number;
    conciliado: number;
  }[];
  adelantos: {
    adelanto_id: string;
    estado: string;
    monto: number;
    compensado: number;
    compensaciones: number;
  }[];
  deudas: {
    deuda_id: string;
    origen: string;
    monto: number;
    recuperado: number;
    recuperos: number;
  }[];
  lotes: { lote_id: string; codigo: string; neto_a_acreditar: number; acreditado_ledger: number }[];
  cuentas_puente: { cuenta: string; ledger: number; detalle: number; diferencia: number }[];
};

export function balanceCheck() {
  return rpc<BalanceCheck>("saldos_conciliacion");
}
