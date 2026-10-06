import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toMovimiento } from "./mappers";
import type { Movimiento, MovimientoRow, Page, Pagination } from "./types";

export type MovimientoFilters = Pagination & {
  /** Búsqueda de texto libre: id_txn, legajo, correo/nombre del cliente y nombre del comercio
   * (ilike server-side; el nombre de comercio se resuelve vía comercios.id → comercio_id.in). */
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

// estado_id + join embebido a estados_movimiento (evita N+1). Incluye comercio_id+bandera para tarjeta (PASO 2).
// Join a comercios(nombre_comercio) SOLO para MOSTRAR el nombre en la tabla (LEFT JOIN sin !inner,
// necesario para no excluir Depósitos/Retiros/Pagos QR que tienen comercio_id NULL).
// La búsqueda por nombre de comercio NO usa este embed: PostgREST ignora filtros de .or() sobre
// embeds sin !inner, así que se resuelve en una query previa a comercios y se agrega como
// comercio_id.in.(...) al .or() (ver buscarComercioIdsPorNombre).
const COLUMNS =
  "id, cliente_id, legajo, id_txn, tipo, cvu, monto_operacion, comision, impuesto, monto_cobrado, fecha, created_at, estado_id, comercio_id, bandera, estados_movimiento(codigo, nombre, es_final), clientes!movimientos_cliente_id_fkey(correo, nombre, cuit), comercios!movimientos_comercio_id_fkey(nombre_comercio)";

/** Resuelve los comercio_id cuyo nombre_comercio matchea el texto (ILIKE), para usarlos
 *  en el .or() de listMovimientos como comercio_id.in.(...). Si ningún comercio matchea
 *  devuelve [] (y el .or() se arma sin esa condición, para no romper la búsqueda). */
async function buscarComercioIdsPorNombre(texto: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercios")
    .select("id")
    .ilike("nombre_comercio", `%${texto}%`)
    .limit(50);
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => r.id);
}

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
    const oraciones = [
      `id_txn.ilike.%${q}%`,
      `legajo.ilike.%${q}%`,
      `clientes.correo.ilike.%${q}%`,
      `clientes.nombre.ilike.%${q}%`,
    ];
    // Texto que podría ser un nombre de comercio: se resuelve fuera del embed (ver
    // buscarComercioIdsPorNombre) y se filtra por comercio_id.in. Así el .or() principal
    // funciona sin depender de joins internos y sin excluir movimientos con comercio_id NULL.
    const comercioIds = await buscarComercioIdsPorNombre(search.trim());
    if (comercioIds.length > 0) oraciones.push(`comercio_id.in.(${comercioIds.join(",")})`);
    query = query.or(oraciones.join(","));
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
