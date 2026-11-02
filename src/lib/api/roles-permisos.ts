import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type {
  EstadoMovimiento,
  EstadoMovimientoRow,
  EstadoPorTipo,
  EstadoPorTipoRow,
  Page,
  Pagination,
} from "./types";

// --- estados de movimiento ------------------------------------------------

const ESTADO_COLUMNS = "id, codigo, nombre, es_final, requiere_conciliacion, created_at";

export async function listEstadosMovimiento(): Promise<EstadoMovimiento[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("estados_movimiento").select(ESTADO_COLUMNS).order("id");
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as EstadoMovimientoRow[]).map((e) => ({
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre,
    esFinal: e.es_final,
    requiereConciliacion: e.requiere_conciliacion,
    createdAt: e.created_at,
  }));
}

export async function listEstadosPorTipo(tipo?: string): Promise<EstadoPorTipo[]> {
  const sb = requireSupabase();
  let query = sb.from("estados_por_tipo").select("tipo_movimiento, estado_id");
  if (tipo) query = query.eq("tipo_movimiento", tipo);
  const { data, error } = await query;
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as EstadoPorTipoRow[]).map((e) => ({
    tipoMovimiento: e.tipo_movimiento,
    estadoId: e.estado_id,
  }));
}

// --- conciliaciones --------------------------------------------------------

const CONC_COLUMNS =
  "id, movimiento_id, fecha_conciliacion, estado_conciliacion, monto_diferencia, archivo_origen, created_at";

export type ConciliacionFilters = Pagination & { search?: string };

export async function listConciliaciones(
  filters: ConciliacionFilters = { page: 0, pageSize: 25 },
): Promise<Page<import("./types").Conciliacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let query = sb.from("conciliaciones").select(CONC_COLUMNS, { count: "exact" });
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.ilike("archivo_origen", `%${q}%`);
  }
  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as import("./types").ConciliacionRow[]).map((c) => ({
    id: c.id,
    movimientoId: c.movimiento_id,
    fechaConciliacion: c.fecha_conciliacion,
    estadoConciliacion: c.estado_conciliacion,
    montoDiferencia: c.monto_diferencia,
    archivoOrigen: c.archivo_origen,
    createdAt: c.created_at,
  }));
  return { rows, total: count ?? rows.length, page, pageSize };
}
