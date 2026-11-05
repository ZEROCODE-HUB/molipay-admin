import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type {
StatusMovement,
StatusMovementRow,
StatusByKind,
StatusByKindRow,
Page,
Pagination,
} from "@/infrastructure/supabase/legacy/types";

// --- estados de movimiento ------------------------------------------------

const STATUS_COLUMNS = "id, codigo, nombre, es_final, requiere_conciliacion, created_at";

export async function listStatusesMovement(): Promise<StatusMovement[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("estados_movimiento").select(STATUS_COLUMNS).order("id");
  if (error) throw toAppError(error);
  return ((data ?? []) as StatusMovementRow[]).map((e) => ({
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre,
    esFinal: e.es_final,
    requiereConciliacion: e.requiere_conciliacion,
    createdAt: e.created_at,
  }));
}

export async function listStatusesByKind(kind?: string): Promise<StatusByKind[]> {
  const sb = requireSupabase();
  let query = sb.from("estados_por_tipo").select("tipo_movimiento, estado_id");
  if (kind) query = query.eq("tipo_movimiento", kind);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return ((data ?? []) as StatusByKindRow[]).map((e) => ({
    tipoMovimiento: e.tipo_movimiento,
    estadoId: e.estado_id,
  }));
}

// --- conciliaciones --------------------------------------------------------

const CONC_COLUMNS =
  "id, movimiento_id, fecha_conciliacion, estado_conciliacion, monto_diferencia, archivo_origen, created_at";

export type ReconciliationFilters = Pagination & { search?: string };

export async function listReconciliations(
  filters: ReconciliationFilters = { page: 0, pageSize: 25 },
): Promise<Page<import("@/infrastructure/supabase/legacy/types").Reconciliation>> {
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
  if (error) throw toAppError(error);
  const rows = (
    (data ?? []) as import("@/infrastructure/supabase/legacy/types").ReconciliationRow[]
  ).map((c) => ({
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
