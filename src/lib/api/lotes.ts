import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { EstadoLote, LoteAcreditacion, LoteAcreditacionRow, Movimiento, MovimientoRow, Page, Pagination } from "./types";
import { toMovimiento } from "./mappers";

// Se lee de la vista v_lotes_acreditacion: trae las columnas del lote, el
// calculo del modulo de acreditaciones (neto Payway, tasa, IVA, cierre,
// impuestos asignados, compensaciones) y el subestado. La vista no embebe el
// comercio: nombre y legajo vienen como columnas propias.
const VISTA = "v_lotes_acreditacion";
const COLUMNS = "*";

function toLote(r: LoteAcreditacionRow): LoteAcreditacion {
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
    banderaId: (r as LoteAcreditacionRow).bandera_id ?? null,
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
    costoPaywayPagoUnico: r.costo_payway_pago_unico != null ? Number(r.costo_payway_pago_unico) : null,
    contracargoMonto: Number(r.contracargo_monto ?? 0),
    comisionCierreLotePct: r.comision_cierre_lote_pct != null ? Number(r.comision_cierre_lote_pct) : null,
    comisionCierreLoteMonto: r.comision_cierre_lote_monto != null ? Number(r.comision_cierre_lote_monto) : null,
    importeNeto: Number(r.importe_neto),
    estado: r.estado,
    esEstimado: r.es_estimado ?? true,
    diasHabilesAplicados: r.dias_habiles_aplicados != null ? Number(r.dias_habiles_aplicados) : null,
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
    importeFinal: Number(r.origen === "archivo" ? (r.neto_a_acreditar ?? r.importe_neto) : r.importe_neto),
    origen: r.origen ?? "venta",
    legacy: r.legacy ?? false,
    establecimiento: r.establecimiento ?? null,
    netoPayway: n(r.neto_payway),
    costoServicioPayway: n(r.costo_servicio_payway),
    impuestosPayway: n(r.impuestos_payway),
    ivaTasaMonto: n(r.iva_tasa_monto),
    impuestosDetalle: Array.isArray(r.impuestos_detalle) ? (r.impuestos_detalle as LoteAcreditacion["impuestosDetalle"]) : [],
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

export type LotesFilters = Pagination & {
  search?: string;
  estado?: EstadoLote;
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
async function resolverComercioIdsPorTexto(texto: string): Promise<string[]> {
  const sb = requireSupabase();
  const qq = texto.trim().replace(/[%_]/g, "\\$&");
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
    const { data: clientes, error } = await sb
      .from("clientes")
      .select("legajo")
      .or(`cuit.ilike.%${qq}%,correo.ilike.%${qq}%,nombre.ilike.%${qq}%`)
      .limit(50);
    if (!error && clientes && clientes.length > 0) {
      const legajos = Array.from(new Set((clientes as { legajo: string }[]).map((c) => c.legajo).filter(Boolean)));
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

export async function listLotes(filters: LotesFilters): Promise<Page<LoteAcreditacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, bandera, comercioId, fechaDesde, fechaHasta } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb.from(VISTA).select(COLUMNS, { count: "exact" });

  if (search?.trim()) {
    const qq = search.trim().replace(/[%_]/g, "\\$&");
    const oraciones: string[] = [`codigo.ilike.%${qq}%`, `bandera.ilike.%${qq}%`];
    const idsComercio = await resolverComercioIdsPorTexto(search.trim());
    if (idsComercio.length > 0) {
      // `in.(uuid1,uuid2,...)` para todos los comercios que matchearon
      // el texto (incluyendo los matcheados por legajo/CUIT/nombre).
      oraciones.push(`comercio_id.in.(${idsComercio.join(",")})`);
    }
    q = q.or(oraciones.join(","));
  }
  // Las proyecciones ya cubiertas por un renglon del archivo (Liquidado)
  // duplicarian el importe del lote real: se ocultan salvo que se pidan.
  if (estado) q = q.eq("estado", estado);
  else q = q.neq("estado", "Liquidado");
  if (bandera) q = q.eq("bandera", bandera);
  if (comercioId) q = q.eq("comercio_id", comercioId);
  if (fechaDesde) q = q.gte("fecha", fechaDesde);
  if (fechaHasta) q = q.lte("fecha", fechaHasta);

  q = q.order("fecha", { ascending: false }).order("codigo", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as LoteAcreditacionRow[]).map(toLote);
  return { rows, total: count ?? rows.length, page, pageSize };
}

export async function getLote(id: string): Promise<LoteAcreditacion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from(VISTA).select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  if (!data) return null;
  return toLote(data as LoteAcreditacionRow);
}

export async function listLoteMovimientos(loteId: string): Promise<Movimiento[]> {
  const sb = requireSupabase();
  // Ventas del lote por RPC del backoffice (no depende de la RLS de lote_movimientos).
  const { data: links, error } = await sb.rpc("lote_ventas", { p_lote_id: loteId });
  if (error) throw new DataAccessError(error);
  const movimientoIds = ((links ?? []) as { id: string }[]).map((r) => r.id);
  if (movimientoIds.length === 0) return [];
  const COLUMNS = "id, cliente_id, legajo, id_txn, tipo, cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha, created_at, estado_id, comercio_id, bandera_id, bandera, estados_movimiento(codigo, nombre, es_final), clientes!transactions_cliente_id_fkey(correo, nombre, cuit)";
  const { data: movimientos, error: movError } = await sb
    .from("transactions")
    .select(COLUMNS)
    .in("id", movimientoIds);
  if (movError) throw new DataAccessError(movError);
  return (movimientos ?? []).map((r) =>
    toMovimiento(r as MovimientoRow & { clientes?: { correo: string; nombre: string; cuit: string }[] | null }),
  );
}

export async function getLotePaywaySnapshotForMovimientos(
  movimientoIds: string[],
): Promise<Map<string, { pct: number; monto: number; loteId: string }>> {
  if (movimientoIds.length === 0) return new Map();
  const sb = requireSupabase();
  const { data: links, error: linkErr } = await sb.from("lote_movimientos").select("lote_id, movimiento_id").in("movimiento_id", movimientoIds);
  if (linkErr) throw new DataAccessError(linkErr);
  const loteIds = [...new Set((links ?? []).map((r: { lote_id: string }) => r.lote_id))];
  if (loteIds.length === 0) return new Map();
  const { data: lotes, error: loteErr } = await sb
    .from("lotes_acreditacion")
    .select("id, tasa_payway_pct, tasa_payway_monto, cantidad_operaciones")
    .in("id", loteIds);
  if (loteErr) throw new DataAccessError(loteErr);
  const loteMap = new Map<string, { pct: number; monto: number; cantidad: number }>(
    (lotes ?? []).map((l: { id: string; tasa_payway_pct: number; tasa_payway_monto: number; cantidad_operaciones: number }) => [
      l.id,
      { pct: Number(l.tasa_payway_pct), monto: Number(l.tasa_payway_monto), cantidad: Number(l.cantidad_operaciones) },
    ]),
  );
  const result = new Map<string, { pct: number; monto: number; loteId: string }>();
  for (const link of links ?? [] as { lote_id: string; movimiento_id: string }[]) {
    const lote = loteMap.get(link.lote_id);
    if (lote) result.set(link.movimiento_id, { pct: lote.pct, monto: lote.monto, loteId: link.lote_id });
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

export type ResumenKpi = { cantidad: number; monto: number };
export type ResumenLotesAdmin = {
  programados: ResumenKpi;
  pendientes: ResumenKpi;
  acreditados: ResumenKpi;
  contracargo: ResumenKpi;
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
export async function resumenLotes(
  filtros: { fechaDesde?: string; fechaHasta?: string } = {},
): Promise<ResumenLotesAdmin> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("resumen_lotes_admin", {
    p_desde: filtros.fechaDesde || null,
    p_hasta: filtros.fechaHasta || null,
  });
  if (error) throw new DataAccessError(error);

  const r = (data ?? {}) as Record<string, { cantidad?: number; monto?: number } | undefined>;
  const norm = (k: string): ResumenKpi => ({
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
export async function exportLotesAcreditacion(
  filters: Omit<LotesFilters, "page" | "pageSize">,
): Promise<LoteAcreditacion[]> {
  const PAGE = 1000;
  const todas: LoteAcreditacion[] = [];
  let page = 0;
  let total = Infinity;

  while (todas.length < total) {
    const r = await listLotes({ ...filters, page, pageSize: PAGE });
    todas.push(...r.rows);
    total = r.total;
    page += 1;
    if (r.rows.length === 0) break;
  }

  return todas;
}

// Las escrituras sobre lotes (updateLote, aplicarLiquidacionLote, acreditarLote,
// resolverContracargo) se quitaron: el modulo de acreditaciones las reemplaza
// por RPCs que calculan en la base (lib/api/acreditaciones.ts).
