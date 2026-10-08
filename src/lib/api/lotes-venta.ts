import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toMovimiento } from "./mappers";
import type { LoteVenta, LoteVentaRow, Movimiento, MovimientoRow, Page, Pagination } from "./types";

/**
 * Columnas de `v_lotes_venta`: la vista (schema remoto) expone el join a
 * `comercios` como columnas planas (`comercios_id`, `comercios_usuario`,
 * `comercios_legajo`, `comercios_nombre_comercio`), no como embed PostgREST.
 * Si algún día la vista cambia a embed, revisar acá antes que en la UI.
 */
const COLUMNS =
  "comercio_id, bandera, fecha, cantidad_operaciones, importe_bruto, impuestos, comision, importe_neto, comercios_id, comercios_usuario, comercios_legajo, comercios_nombre_comercio";

function toLoteVenta(r: LoteVentaRow): LoteVenta {
  return {
    comercioId: r.comercio_id,
    bandera: r.bandera,
    fecha: r.fecha,
    cantidadOperaciones: Number(r.cantidad_operaciones),
    importeBruto: Number(r.importe_bruto),
    impuestos: Number(r.impuestos),
    comision: Number(r.comision),
    importeNeto: Number(r.importe_neto),
    // Fórmula corregida en pantalla (la vista devuelve otro significado en importe_neto).
    netoEstimado: Number(r.importe_bruto) - Number(r.impuestos) - Number(r.comision),
    comercio:
      r.comercios_id || r.comercios_usuario || r.comercios_legajo || r.comercios_nombre_comercio
        ? {
            id: r.comercios_id ?? r.comercio_id,
            usuario: r.comercios_usuario ?? "",
            legajo: r.comercios_legajo ?? "",
            nombreComercio: r.comercios_nombre_comercio ?? null,
          }
        : null,
  };
}

export type LotesVentaFilters = Pagination & {
  search?: string;
  bandera?: string;
  comercioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

export async function listLotesVenta(filters: LotesVentaFilters): Promise<Page<LoteVenta>> {
  const sb = requireSupabase();
  const { page, pageSize, search, bandera, comercioId, fechaDesde, fechaHasta } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb.from("v_lotes_venta").select(COLUMNS, { count: "exact" });

  if (search?.trim()) {
    const qq = search.trim().replace(/[%_]/g, "\\$&");
    // Nombre de comercio, legajo (LPF-/LPJ-, que incluye el CUIT) o bandera.
    q = q.or(
      `comercios_nombre_comercio.ilike.%${qq}%,comercios_legajo.ilike.%${qq}%,bandera.ilike.%${qq}%`,
    );
  }
  if (bandera) q = q.eq("bandera", bandera);
  if (comercioId) q = q.eq("comercio_id", comercioId);
  if (fechaDesde) q = q.gte("fecha", fechaDesde);
  if (fechaHasta) q = q.lte("fecha", fechaHasta);

  q = q.order("fecha", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as LoteVentaRow[]).map(toLoteVenta);
  return { rows, total: count ?? rows.length, page, pageSize };
}

/**
 * Exportación: devuelve TODAS las filas que matchean los filtros (sin paginar).
 * Recorre las páginas de 1000 en 1000 para no golpear el límite de una sola
 * request de PostgREST. La exportación se hace sobre el filtrado actual, no
 * solo sobre la página visible.
 */
export async function exportLotesVenta(filters: Omit<LotesVentaFilters, "page" | "pageSize">): Promise<LoteVenta[]> {
  const PAGE = 1000;
  const todas: LoteVenta[] = [];
  let page = 0;
  let total = Infinity;

  while (todas.length < total) {
    const r = await listLotesVenta({ ...filters, page, pageSize: PAGE });
    todas.push(...r.rows);
    total = r.total;
    page += 1;
    if (r.rows.length === 0) break;
  }

  return todas;
}

/**
 * Operaciones individuales de un lote de venta: movimientos tipo `tarjeta`
 * del comercio, misma bandera y el mismo día de la fecha del lote.
 *
 * La vista `v_lotes_venta` agrupa por `date(movimientos.fecha)`, así que el
 * detalle se reconstruye desde `movimientos` con ese mismo corte (la fecha es
 * timestamptz: `>= inicio del día` y `< día siguiente`).
 */
export type OperacionesLoteFilters = Pagination & {
  comercioId: string;
  bandera: string;
  fecha: string; // YYYY-MM-DD (fecha del lote)
  search?: string;
};

const OPS_COLUMNS = [
  "id",
  "id_txn",
  "fecha",
  "monto_operacion",
  "comision",
  "impuesto",
  "monto_cobrado",
  "estado_id",
  "legajo",
  "bandera",
  "estados_movimiento(codigo, nombre, es_final)",
  "clientes!movimientos_cliente_id_fkey(correo, nombre, cuit)",
].join(", ");

export async function listOperacionesLote(
  f: OperacionesLoteFilters,
): Promise<Page<Movimiento>> {
  const sb = requireSupabase();
  const { page, pageSize, comercioId, bandera, fecha, search } = f;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const inicio = `${fecha}T00:00:00`;
  const fin = `${fecha}T23:59:59.999`;

  let q = sb.from("movimientos").select(OPS_COLUMNS, { count: "exact" });

  q = q
    .eq("comercio_id", comercioId)
    .eq("bandera", bandera)
    .eq("tipo", "tarjeta")
    .gte("fecha", inicio)
    .lte("fecha", fin);

  if (search?.trim()) {
    const qq = search.trim().replace(/[%_]/g, "\\$&");
    q = q.or(
      `id_txn.ilike.%${qq}%,legajo.ilike.%${qq}%,clientes.nombre.ilike.%${qq}%,clientes.correo.ilike.%${qq}%`,
    );
  }

  q = q.order("fecha", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw new DataAccessError(error);

  const rows = ((data ?? []) as (MovimientoRow & {
    clientes?: { correo: string; nombre: string; cuit: string }[] | null;
  })[]).map(toMovimiento);

  return { rows, total: count ?? rows.length, page, pageSize };
}