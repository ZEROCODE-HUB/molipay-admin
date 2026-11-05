import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type {
StatusBatch,
BatchCredit,
BatchCreditRow,
Movement,
MovementRow,
Page,
Pagination,
} from "@/infrastructure/supabase/legacy/types";
import { toMovement } from "@/infrastructure/supabase/legacy/mappers";

// Se lee de la vista v_lotes_acreditacion: trae las columnas del lote, el
// calculo del modulo de acreditaciones (neto Payway, tasa, IVA, cierre,
// impuestos asignados, compensaciones) y el subestado. La vista no embebe el
// comercio: nombre y legajo vienen como columnas propias.
const VISTA = "v_lotes_acreditacion";
const COLUMNS = "*";

function toBatch(r: BatchCreditRow): BatchCredit {
  // PostgREST devuelve OBJECT para relaciones to-one (comercio_id -> comercios.id),
  // no un array. Antes era `Array.isArray(...) ? [0] : null`, que daba null
  // siempre: la celda mostraba "—" y el legajo caia al fallback del uuid.
  const com = Array.isArray(r.comercios) ? (r.comercios[0] ?? null) : (r.comercios ?? null);
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: r.id,
    codigo: r.codigo,
    comercioId: r.comercio_id,
    /** Texto denormalizado. FK real: banderaId */
    banderaId: (r as BatchCreditRow).bandera_id ?? null,
    bandera: r.bandera,
    fecha: r.fecha,
    cantidadOperaciones: Number(r.cantidad_operaciones),
    importeBruto: Number(r.importe_bruto),
    impuestos: Number(r.impuestos),
    tasaPaywayPct: Number(r.tasa_payway_pct),
    tasaPaywayMonto: Number(r.tasa_payway_monto),
    tasaMolipayPct: Number(r.tasa_molipay_pct),
    tasaMolipayMonto: Number(r.tasa_molipay_monto),
    cuotas: r.cuotas != null ? Number(r.cuotas) : null,
    costoPaywayPagoUnico:
      r.costo_payway_pago_unico != null ? Number(r.costo_payway_pago_unico) : null,
    contracargoMonto: Number(r.contracargo_monto ?? 0),
    comisionCierreLotePct:
      r.comision_cierre_lote_pct != null ? Number(r.comision_cierre_lote_pct) : null,
    comisionCierreLoteMonto:
      r.comision_cierre_lote_monto != null ? Number(r.comision_cierre_lote_monto) : null,
    importeNeto: Number(r.importe_neto),
    estado: r.estado,
    esEstimado: r.es_estimado ?? true,
    diasHabilesAplicados:
      r.dias_habiles_aplicados != null ? Number(r.dias_habiles_aplicados) : null,
    fechaEstimadaRecalcular: r.fecha_estimada_recalcular ?? false,
    resueltoPor: r.resuelto_por,
    fechaResolucion: r.fecha_resolucion,
    notasResolucion: r.notas_resolucion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ivaMonto: r.iva_monto != null ? Number(r.iva_monto) : null,
    iibbMonto: r.iibb_monto != null ? Number(r.iibb_monto) : null,
    debitoCreditoMonto: r.debito_credito_monto != null ? Number(r.debito_credito_monto) : null,
    fechaCobroReal: r.fecha_cobro_real ?? null,
    comercio: com
      ? {
          id: com.id,
          usuario: com.usuario,
          legajo: com.legajo,
          nombreComercio: com.nombre_comercio,
          siteId: com.site_id ?? null,
        }
      : r.comercio_legajo
        ? {
            id: r.comercio_id,
            usuario: r.comercio_usuario ?? "",
            legajo: r.comercio_legajo,
            nombreComercio: r.comercio_nombre ?? null,
            siteId: null,
          }
        : null,
    importeFinal: Number(
      r.origen === "archivo" ? (r.neto_a_acreditar ?? r.importe_neto) : r.importe_neto,
    ),
    origen: r.origen ?? "venta",
    legacy: r.legacy ?? false,
    establecimiento: r.establecimiento ?? null,
    netoPayway: n(r.neto_payway),
    costoServicioPayway: n(r.costo_servicio_payway),
    impuestosPayway: n(r.impuestos_payway),
    ivaTasaMonto: n(r.iva_tasa_monto),
    impuestosDetalle: Array.isArray(r.impuestos_detalle)
      ? (r.impuestos_detalle as BatchCredit["impuestosDetalle"])
      : [],
    retencionContracargos: Number(r.retencion_contracargos ?? 0),
    retencionPendiente: Number(r.retencion_pendiente ?? 0),
    compensacionAdelantos: Number(r.compensacion_adelantos ?? 0),
    recuperacionDeuda: Number(r.recuperacion_deuda ?? 0),
    netoAcreditar: n(r.neto_a_acreditar),
    conciliado: r.conciliado ?? false,
    esNegativo: r.es_negativo ?? false,
    fechaAcreditacion: r.fecha_acreditacion ?? null,
    subestado: r.subestado ?? null,
    motivoNoElegible: r.motivo_no_elegible ?? null,
    elegible: r.elegible ?? false,
    contracargos: Number(r.contracargos ?? 0),
  };
}

export type BatchesFilters = Pagination & {
  search?: string;
  estado?: StatusBatch;
  bandera?: string;
  comercioId?: string;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string;
};

/**
 * Resuelve un texto libre a IDs de comercios coincidentes.
 *
 * El join `comercios!lotes_acreditacion_comercio_id_fkey` no soporta
 * `or()` sobre columnas de la relación, así que la búsqueda por texto
 * se hace en tres pasos:
 *
 *   1. Comercios: nombre_comercio, legajo (LPF-/LPJ- + CUIT sin guiones) o usuario.
 *   2. Clientes: cuit, correo o nombre → legajos.
 *   3. Comercios por esos legajos (clientes↔comercios comparten legajo).
 *
 * El resultado se une y se filtra el listado de lotes con `comercio_id.in.(...)`.
 * El legajo embebe el CUIT así que el paso 1 ya cubre el caso más común
 * (búsqueda de dígitos); el paso 2 lo refuerza para CUITs formateados o
 * nombre del cliente titular del comercio.
 */
async function resolverMerchantIdsByText(text: string): Promise<string[]> {
  const sb = requireSupabase();
  const qq = text.trim().replace(/[%_]/g, "\\$&");
  if (!qq) return [];
  const ids = new Set<string>();

  try {
    const { data, error } = await sb
      .from("comercios")
      .select("id")
      .or(`nombre_comercio.ilike.%${qq}%,legajo.ilike.%${qq}%,usuario.ilike.%${qq}%`)
      .limit(100);
    if (!error) for (const c of (data ?? []) as { id: string }[]) ids.add(c.id);
  } catch {
    // RLS o tabla ausente: se continúa con clientes
  }

  try {
    const { data: customers, error } = await sb
      .from("clientes")
      .select("legajo")
      .or(`cuit.ilike.%${qq}%,correo.ilike.%${qq}%,nombre.ilike.%${qq}%`)
      .limit(50);
    if (!error && customers && customers.length > 0) {
      const legajos = Array.from(
        new Set((customers as { legajo: string }[]).map((c) => c.legajo).filter(Boolean)),
      );
      if (legajos.length > 0) {
        const { data: cs, error: e2 } = await sb
          .from("comercios")
          .select("id")
          .in("legajo", legajos)
          .limit(100);
        if (!e2) for (const c of (cs ?? []) as { id: string }[]) ids.add(c.id);
      }
    }
  } catch {
    // RLS o tabla ausente: se sigue con el set parcial
  }

  return Array.from(ids);
}

export async function listBatches(filters: BatchesFilters): Promise<Page<BatchCredit>> {
  const sb = requireSupabase();
  const {
    page,
    pageSize,
    search,
    estado: status,
    bandera: brand,
    comercioId: merchantId,
    fechaDesde: dateFrom,
    fechaHasta: dateTo,
  } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb.from(VISTA).select(COLUMNS, { count: "exact" });

  if (search?.trim()) {
    const qq = search.trim().replace(/[%_]/g, "\\$&");
    const oraciones: string[] = [`codigo.ilike.%${qq}%`, `bandera.ilike.%${qq}%`];
    const idsMerchant = await resolverMerchantIdsByText(search.trim());
    if (idsMerchant.length > 0) {
      // `in.(uuid1,uuid2,...)` para todos los comercios que matchearon
      // el texto (incluyendo los matcheados por legajo/CUIT/nombre).
      oraciones.push(`comercio_id.in.(${idsMerchant.join(",")})`);
    }
    q = q.or(oraciones.join(","));
  }
  // Las proyecciones ya cubiertas por un renglon del archivo (Liquidado)
  // duplicarian el importe del lote real: se ocultan salvo que se pidan.
  if (status) q = q.eq("estado", status);
  else q = q.neq("estado", "Liquidado");
  if (brand) q = q.eq("bandera", brand);
  if (merchantId) q = q.eq("comercio_id", merchantId);
  if (dateFrom) q = q.gte("fecha", dateFrom);
  if (dateTo) q = q.lte("fecha", dateTo);

  // Primero lo mas cercano a hoy; a igual distancia, lo ultimo registrado.
  q = q
    .order("accreditation_distance_days")
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, to);

  const { data, error, count } = await q;
  if (error) throw toAppError(error);
  const rows = ((data ?? []) as BatchCreditRow[]).map(toBatch);
  return { rows, total: count ?? rows.length, page, pageSize };
}

export type BatchProjection = {
  bruto: number;
  paywayPct: number;
  paywayMonto: number;
  impuestosPct: number;
  impuestosMonto: number;
  netoPayway: number;
  tasaPct: number;
  tasaMonto: number;
  ivaPct: number;
  ivaMonto: number;
  cierrePct: number;
  cierreMonto: number;
  usaIibb: boolean;
  iibb: { alicuota: number; monto: number; nota: string | null } | null;
  usaDyc: boolean;
  dyc: { alicuota: number; monto: number; nota: string | null } | null;
  compensacionAdelantos: number;
  netoFinal: number;
};

/** Desglose estimado de un lote sin archivo de Payway (lo calcula la base). */
export async function getBatchProjection(id: string): Promise<BatchProjection> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("lote_proyeccion", { p_lote_id: id });
  if (error) throw toAppError(error);
  const r = data as Record<string, number | string>;
  const { iibb, dyc } = data as {
    iibb?: { alicuota: number; monto: number; nota: string | null } | null;
    dyc?: { alicuota: number; monto: number; nota: string | null } | null;
  };
  return {
    bruto: Number(r.bruto),
    paywayPct: Number(r.payway_pct),
    paywayMonto: Number(r.payway_monto),
    impuestosPct: Number(r.impuestos_pct),
    impuestosMonto: Number(r.impuestos_monto),
    netoPayway: Number(r.neto_payway),
    tasaPct: Number(r.tasa_pct),
    tasaMonto: Number(r.tasa_monto),
    ivaPct: Number(r.iva_pct),
    ivaMonto: Number(r.iva_monto),
    cierrePct: Number(r.cierre_pct),
    cierreMonto: Number(r.cierre_monto),
    usaIibb: Boolean((data as { usa_iibb?: boolean }).usa_iibb),
    iibb: iibb
      ? { alicuota: Number(iibb.alicuota), monto: Number(iibb.monto), nota: iibb.nota ?? null }
      : null,
    usaDyc: Boolean((data as { usa_dyc?: boolean }).usa_dyc),
    dyc: dyc
      ? { alicuota: Number(dyc.alicuota), monto: Number(dyc.monto), nota: dyc.nota ?? null }
      : null,
    compensacionAdelantos: Number(r.compensacion_adelantos),
    netoFinal: Number(r.neto_final),
  };
}

/** Prende o apaga la retencion IIBB del padron en un lote. La base recalcula. */
export async function setBatchUsaIibb(id: string, usa: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("lote_set_usa_iibb", { p_lote_id: id, p_usa: usa });
  if (error) throw toAppError(error);
}

/** Prende o apaga Debitos y Creditos en un lote. La base recalcula. */
export async function setBatchUsaDyc(id: string, usa: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("lote_set_usa_dyc" as never, { p_lote_id: id, p_usa: usa } as never);
  if (error) throw toAppError(error);
}

export async function getBatch(id: string): Promise<BatchCredit | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from(VISTA).select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  return toBatch(data as BatchCreditRow);
}

export async function listBatchMovements(batchId: string): Promise<Movement[]> {
  const sb = requireSupabase();
  // Ventas del lote por RPC del backoffice (no depende de la RLS de lote_movimientos).
  const { data: links, error } = await sb.rpc("lote_ventas", { p_lote_id: batchId });
  if (error) throw toAppError(error);
  const movementIds = ((links ?? []) as { id: string }[]).map((r) => r.id);
  if (movementIds.length === 0) return [];
  const COLUMNS =
    "id, cliente_id, legajo, id_txn, tipo, cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha, created_at, estado_id, comercio_id, bandera_id, bandera, estados_movimiento(codigo, nombre, es_final), clientes!transactions_cliente_id_fkey(correo, nombre, cuit)";
  const { data: movements, error: movError } = await sb
    .from("transactions")
    .select(COLUMNS)
    .in("id", movementIds);
  if (movError) throw toAppError(movError);
  return (movements ?? []).map((r) =>
    toMovement(
      r as MovementRow & { clientes?: { correo: string; nombre: string; cuit: string }[] | null },
    ),
  );
}

export async function getBatchPaywaySnapshotForMovements(
  movementIds: string[],
): Promise<Map<string, { pct: number; monto: number; loteId: string }>> {
  if (movementIds.length === 0) return new Map();
  const sb = requireSupabase();
  const { data: links, error: linkErr } = await sb
    .from("lote_movimientos")
    .select("lote_id, movimiento_id")
    .in("movimiento_id", movementIds);
  if (linkErr) throw toAppError(linkErr);
  const batchIds = [...new Set((links ?? []).map((r: { lote_id: string }) => r.lote_id))];
  if (batchIds.length === 0) return new Map();
  const { data: batches, error: batchErr } = await sb
    .from("lotes_acreditacion")
    .select("id, tasa_payway_pct, tasa_payway_monto, cantidad_operaciones")
    .in("id", batchIds);
  if (batchErr) throw toAppError(batchErr);
  const batchMap = new Map<string, { pct: number; monto: number; cantidad: number }>(
    (batches ?? []).map(
      (l: {
        id: string;
        tasa_payway_pct: number;
        tasa_payway_monto: number;
        cantidad_operaciones: number;
      }) => [
        l.id,
        {
          pct: Number(l.tasa_payway_pct),
          monto: Number(l.tasa_payway_monto),
          cantidad: Number(l.cantidad_operaciones),
        },
      ],
    ),
  );
  const result = new Map<string, { pct: number; monto: number; loteId: string }>();
  for (const link of links ?? ([] as { lote_id: string; movimiento_id: string }[])) {
    const batch = batchMap.get(link.lote_id);
    if (batch)
      result.set(link.movimiento_id, { pct: batch.pct, monto: batch.monto, loteId: link.lote_id });
  }
  return result;
}

/**
 * Resultado de aplicar un archivo de liquidacion de Payway a un lote.
 *
 * Cada campo tiene columna en `lotes_acreditacion`: son el snapshot de lo que
 * dijo el archivo y de lo que se descontó, para que el lote siga siendo
 * auditable si mañana cambia la comision de cierre o la alicuota de retencion.
 *
 * Lo que NO se guarda es el `TOTAL_NETO` del CSV, aunque es la base del calculo.
 * No hay donde: se reconstruye sumando los descuentos al `importe_neto` final,
 * que es la misma cuenta al reves.
 */
// =====================================================================
// RPCs del flujo Programado → (Subir CSV) → Pendiente → (Acreditar) → Acreditado
// =====================================================================

export type SummaryKpi = { cantidad: number; monto: number };
export type SummaryBatchesAdmin = {
  programados: SummaryKpi;
  pendientes: SummaryKpi;
  acreditados: SummaryKpi;
  contracargo: SummaryKpi;
};

/**
 * KPIs por estado para las cards de la pantalla.
 *
 * Rango de fechas opcional: si no se pasa, se devuelve el universo
 * completo. Los filtros se aplican en la SQL con la columna `fecha`
 * (programados/pendientes/contracargo) y con `fecha_resolucion` para
 * `Acreditado` — el "Mes" del KPI se mide por la fecha de pago, no
 * por la del lote, así que meses pasados no pierden acreditaciones.
 */
export async function summaryBatches(
  filters: { fechaDesde?: string; fechaHasta?: string } = {},
): Promise<SummaryBatchesAdmin> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("resumen_lotes_admin", {
    p_desde: filters.fechaDesde || null,
    p_hasta: filters.fechaHasta || null,
  });
  if (error) throw toAppError(error);

  const r = (data ?? {}) as Record<string, { cantidad?: number; monto?: number } | undefined>;
  const norm = (k: string): SummaryKpi => ({
    cantidad: Number(r[k]?.cantidad ?? 0),
    monto: Number(r[k]?.monto ?? 0),
  });
  return {
    programados: norm("programados"),
    pendientes: norm("pendientes"),
    acreditados: norm("acreditados"),
    contracargo: norm("contracargo"),
  };
}

/**
 * Exporta todas las filas que matchean los filtros sin paginar.
 * Recorre páginas de 1000 hasta vaciar; el tamaño evita pegar el tope
 * de PostgREST de una sola request.
 */
export async function exportBatchesCredit(
  filters: Omit<BatchesFilters, "page" | "pageSize">,
): Promise<BatchCredit[]> {
  const PAGE = 1000;
  const all: BatchCredit[] = [];
  let page = 0;
  let total = Infinity;

  while (all.length < total) {
    const r = await listBatches({ ...filters, page, pageSize: PAGE });
    all.push(...r.rows);
    total = r.total;
    page += 1;
    if (r.rows.length === 0) break;
  }

  return all;
}

// Las escrituras sobre lotes (updateLote, aplicarLiquidacionLote, acreditarLote,
// resolverContracargo) se quitaron: el modulo de acreditaciones las reemplaza
// por RPCs que calculan en la base (lib/api/acreditaciones.ts).
