import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { EstadoLote, LoteAcreditacion, LoteAcreditacionRow, Page, Pagination } from "./types";

const COLUMNS =
  "id, codigo, comercio_id, bandera, fecha, cantidad_operaciones, importe_bruto, impuestos, tasa_payway_pct, tasa_payway_monto, tasa_molipay_pct, tasa_molipay_monto, cuotas, costo_payway_pago_unico, contracargo_monto, importe_neto, estado, resuelto_por, fecha_resolucion, notas_resolucion, created_at, updated_at, comercios(id, usuario, legajo, nombre_comercio)";

function toLote(r: LoteAcreditacionRow): LoteAcreditacion {
  const com = Array.isArray(r.comercios) ? r.comercios[0] : null;
  return {
    id: r.id,
    codigo: r.codigo,
    comercioId: r.comercio_id,
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
    importeNeto: Number(r.importe_neto),
    estado: r.estado,
    resueltoPor: r.resuelto_por,
    fechaResolucion: r.fecha_resolucion,
    notasResolucion: r.notas_resolucion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    comercio: com ? { id: com.id, usuario: com.usuario, legajo: com.legajo, nombreComercio: com.nombre_comercio } : null,
    importeFinal: Number(r.importe_neto),
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

export async function listLotes(filters: LotesFilters): Promise<Page<LoteAcreditacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, bandera, comercioId, fechaDesde, fechaHasta } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb.from("lotes_acreditacion").select(COLUMNS, { count: "exact" });

  if (search?.trim()) {
    const qq = search.trim().replace(/[%_]/g, "\\$&");
    // codigo, bandera, comercio legajo/usuario via join not directly filterable via or; fallback to codigo/bandera
    // For comercio search we filter via comercio_id in client or via ilike on joined field using !inner
    q = q.or(`codigo.ilike.%${qq}%,bandera.ilike.%${qq}%`);
  }
  if (estado) q = q.eq("estado", estado);
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
  const { data, error } = await sb.from("lotes_acreditacion").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  if (!data) return null;
  return toLote(data as LoteAcreditacionRow);
}

export async function listLoteMovimientos(loteId: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("lote_movimientos").select("movimiento_id").eq("lote_id", loteId);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r: { movimiento_id: string }) => r.movimiento_id);
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

export type UpdateLoteInput = {
  estado?: EstadoLote;
  contracargoMonto?: number;
  notasResolucion?: string | null;
};

export async function updateLote(id: string, input: UpdateLoteInput): Promise<LoteAcreditacion> {
  const sb = requireSupabase();

  // Need current values for recalc if contracargo changes
  const current = await getLote(id);
  if (!current) throw new DataAccessError(new Error("Lote no encontrado"));

  const payload: Record<string, unknown> = {};

  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.contracargoMonto !== undefined) payload.contracargo_monto = input.contracargoMonto;
  if (input.notasResolucion !== undefined) payload.notas_resolucion = input.notasResolucion;

  // Recalcular importe_neto si cambia contracargo o estado a Contracargo
  if (input.contracargoMonto !== undefined || input.estado === "Contracargo") {
    const contracargo = input.contracargoMonto !== undefined ? input.contracargoMonto : current.contracargoMonto;
    const importeNeto = Number(current.importeBruto) - Number(current.impuestos) - Number(current.tasaPaywayMonto) - Number(current.tasaMolipayMonto) - Number(contracargo ?? 0);
    // costo_payway_pago_unico is NOT included per spec (spec says only those 4 components); keep as is
    // If you want to include costo, uncomment: - Number(current.costoPaywayPagoUnico ?? 0)
    payload.importe_neto = importeNeto;
  }

  // Resolver tracking
  if (input.estado !== undefined) {
    // resuelto_por = auth.uid(), fecha_resolucion = now()
    try {
      const { data: auth } = await sb.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (uid) payload.resuelto_por = uid;
    } catch {
      // ignore
    }
    payload.fecha_resolucion = new Date().toISOString();
  }

  const { data, error } = await sb.from("lotes_acreditacion").update(payload).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toLote(data as LoteAcreditacionRow);
}

// Convenience wrappers for UI actions
export async function acreditarLote(id: string, notas?: string): Promise<LoteAcreditacion> {
  return updateLote(id, { estado: "Acreditado", notasResolucion: notas ?? null });
}

export async function rechazarLote(id: string, notas?: string): Promise<LoteAcreditacion> {
  return updateLote(id, { estado: "Rechazado", notasResolucion: notas ?? null });
}

export async function resolverContracargo(
  id: string,
  accion: "Acreditar" | "Rechazar",
  args: { contracargoMonto?: number; notas?: string },
): Promise<LoteAcreditacion> {
  // Si accion es Acreditar/Rechazar sobre un lote en Contracargo, se cambia estado y opcionalmente contracargo
  const estado = accion === "Acreditar" ? "Acreditado" : "Rechazado";
  return updateLote(id, { estado, contracargoMonto: args.contracargoMonto, notasResolucion: args.notas ?? null });
}
