import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { LoteVenta, LoteVentaRow, Page, Pagination } from "./types";

const COLUMNS =
  "comercio_id, bandera, fecha, cantidad_operaciones, importe_bruto, impuestos, comision, importe_neto, comercios(id, usuario, legajo, nombre_comercio)";

function toLoteVenta(r: LoteVentaRow): LoteVenta {
  // Igual que en lotes.ts: PostgREST devuelve OBJECT para el join to-one, no
  // array. Con solo `Array.isArray(...) ? [0] : null` el nombre de comercio
  // quedaba siempre vacio.
  const com = Array.isArray(r.comercios) ? (r.comercios[0] ?? null) : (r.comercios ?? null);
  return {
    comercioId: r.comercio_id,
    bandera: r.bandera,
    fecha: r.fecha,
    cantidadOperaciones: Number(r.cantidad_operaciones),
    importeBruto: Number(r.importe_bruto),
    impuestos: Number(r.impuestos),
    comision: Number(r.comision),
    importeNeto: Number(r.importe_neto),
    comercio: com ? { id: com.id, usuario: com.usuario, legajo: com.legajo, nombreComercio: com.nombre_comercio } : null,
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
    q = q.or(`bandera.ilike.%${qq}%`);
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
