import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type {
  EstadoMovimiento,
  EstadoMovimientoRow,
  EstadoPorTipo,
  EstadoPorTipoRow,
  Page,
  Pagination,
  Permiso,
  PermisoRow,
  Recurso,
  RecursoRow,
  Rol,
  RolRow,
} from "./types";

// --- roles (catálogo editable) --------------------------------------------

const ROL_COLUMNS = "id, nombre, descripcion, created_at, updated_at";

export async function listRoles(): Promise<Rol[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("roles").select(ROL_COLUMNS).order("nombre");
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as RolRow[]).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertRol(input: {
  id?: string;
  nombre: string;
  descripcion?: string | null;
}): Promise<Rol> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
  };
  if (input.id) payload.id = input.id;
  const { data, error } = await sb.from("roles").upsert(payload).select(ROL_COLUMNS).single();
  if (error) throw new DataAccessError(error);
  const r = data as RolRow;
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function deleteRol(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("roles").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// --- recursos (catálogo de módulos) ---------------------------------------

const RECURSO_COLUMNS = "id, codigo, nombre, modulo";

export async function listRecursos(): Promise<Recurso[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("recursos")
    .select(RECURSO_COLUMNS)
    .order("modulo")
    .order("nombre");
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as RecursoRow[]).map((r) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    modulo: r.modulo,
  }));
}

// --- permisos (matriz rol x recurso) ---------------------------------------

const PERMISO_COLUMNS =
  "id, rol_id, recurso_id, puede_leer, puede_crear, puede_modificar, puede_borrar";

export async function getPermisosByRol(rolId: string): Promise<Permiso[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("permisos").select(PERMISO_COLUMNS).eq("rol_id", rolId);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as PermisoRow[]).map((p) => ({
    id: p.id,
    rolId: p.rol_id,
    recursoId: p.recurso_id,
    puedeLeer: p.puede_leer,
    puedeCrear: p.puede_crear,
    puedeModificar: p.puede_modificar,
    puedeBorrar: p.puede_borrar,
  }));
}

export type PermisoInput = {
  id?: string;
  rolId: string;
  recursoId: string;
  puedeLeer?: boolean;
  puedeCrear?: boolean;
  puedeModificar?: boolean;
  puedeBorrar?: boolean;
};

export async function upsertPermiso(input: PermisoInput): Promise<Permiso> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    rol_id: input.rolId,
    recurso_id: input.recursoId,
    puede_leer: input.puedeLeer ?? false,
    puede_crear: input.puedeCrear ?? false,
    puede_modificar: input.puedeModificar ?? false,
    puede_borrar: input.puedeBorrar ?? false,
  };
  if (input.id) payload.id = input.id;
  const { data, error } = await sb
    .from("permisos")
    .upsert(payload)
    .select(PERMISO_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  const p = data as PermisoRow;
  return {
    id: p.id,
    rolId: p.rol_id,
    recursoId: p.recurso_id,
    puedeLeer: p.puede_leer,
    puedeCrear: p.puede_crear,
    puedeModificar: p.puede_modificar,
    puedeBorrar: p.puede_borrar,
  };
}

// --- estados_movimiento (catálogo, cacheable en sesión) -------------------

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
