import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toMovimiento } from "./mappers";
import type { Movimiento, MovimientoRow, Page, Pagination } from "./types";

export type MovimientoFilters = Pagination & {
  /** Búsqueda de texto libre: id_txn, legajo o correo/nombre del cliente (ilike server-side). */
  search?: string;
  /** Código de estado (estados_movimiento.codigo), p. ej. "APROBADO". */
  estadoCodigo?: string;
  tipo?: string;
  clienteId?: string;
  legajo?: string;
  fechaDesde?: string; // ISO
  fechaHasta?: string; // ISO
  /** Solo movimientos con retención de impuesto al cliente (columna impuesto > 0). */
  conImpuesto?: boolean;
  /** Solo movimientos con comisión cobrada (columna comision > 0). */
  conComision?: boolean;
  /**
   * Modo de conteo. Para tablas de gran volumen (120k+ filas) usar "estimated"
   * evita un COUNT costoso en cada página. "exact" solo cuando se necesite el total real.
   */
  countMode?: "exact" | "planned" | "estimated";
};

// estado_id + join embebido a estados_movimiento (evita N+1).
const COLUMNS =
  "id, cliente_id, legajo, id_txn, tipo, cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha, created_at, estado_id, estados_movimiento(codigo, nombre, es_final), clientes!movimientos_cliente_id_fkey(correo, nombre, cuit)";

export async function listMovimientos(filters: MovimientoFilters): Promise<Page<Movimiento>> {
  const sb = requireSupabase();
  const {
    page,
    pageSize,
    search,
    estadoCodigo,
    tipo,
    clienteId,
    legajo,
    fechaDesde,
    fechaHasta,
    conImpuesto,
    conComision,
    countMode = "estimated",
  } = filters;

  // Filtros estructurados (acotan por índice) SÍ ameritan COUNT exacto;
  // la búsqueda de texto libre (ilike) NO fuerza exact por sí sola.
  const filtrosEstructuradosActivos = Boolean(
    estadoCodigo ||
      tipo ||
      clienteId ||
      legajo ||
      fechaDesde ||
      fechaHasta ||
      conImpuesto ||
      conComision,
  );
  const countModeEfectivo: "exact" | "planned" | "estimated" = filtrosEstructuradosActivos
    ? "exact"
    : countMode;

  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("movimientos").select(COLUMNS, { count: countModeEfectivo });

  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (legajo) query = query.eq("legajo", legajo.trim().toUpperCase());
  if (estadoCodigo) query = query.eq("estados_movimiento.codigo", estadoCodigo);
  if (tipo) query = query.eq("tipo", tipo);
  if (conImpuesto) query = query.gt("impuesto", 0);
  if (conComision) query = query.gt("comision", 0);
  if (fechaDesde) query = query.gte("fecha", fechaDesde);
  if (fechaHasta) query = query.lte("fecha", fechaHasta);
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `id_txn.ilike.%${q}%,legajo.ilike.%${q}%,clientes.correo.ilike.%${q}%,clientes.nombre.ilike.%${q}%`,
    );
  }

  query = query.order("fecha", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (MovimientoRow & {
    clientes?: { correo: string; nombre: string; cuit: string }[] | null;
  })[];

  return {
    rows: rows.map(toMovimiento),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getMovimiento(id: string): Promise<Movimiento | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("movimientos").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data
    ? toMovimiento(
        data as MovimientoRow & {
          clientes?: { correo: string; nombre: string; cuit: string }[] | null;
        },
      )
    : null;
}
