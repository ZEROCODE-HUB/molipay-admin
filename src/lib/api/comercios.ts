import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toComercio, toPuntoVenta } from "./mappers";
import type {
  ClienteSelect,
  Comercio,
  ComercioInput,
  ComercioRow,
  EstadoComercio,
  NivelComercio,
  Page,
  Pagination,
  PuntoVenta,
  PuntoVentaRow,
  TipoPersona,
} from "./types";

export type ComercioFilters = Pagination & {
  /** Búsqueda de texto libre: usuario (email) o legajo del comercio. */
  search?: string;
  estado?: EstadoComercio;
  nivel?: NivelComercio;
};

// legajo es FK real a clientes.legajo -> la relación embebida se llama `clientes`.
const COLUMNS =
  "id, usuario, legajo, categoria_id, estado, nivel, habilitado_pago_transferencia, habilitado_enlaces_pago, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at)";
const COLUMNS_LEGACY =
  "id, usuario, legajo, categoria_id, estado, nivel, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at)";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /habilitado_pago_transferencia|habilitado_enlaces_pago|column.*does not exist|PGRST204|schema cache/i.test(msg);
}

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listComercios(filters: ComercioFilters): Promise<Page<Comercio>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, nivel } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const buildQuery = (cols: string) => {
    let q = sb.from("comercios").select(cols, { count: "exact" });
    if (search && search.trim()) {
      const qq = escapeLike(search);
      q = q.or(`usuario.ilike.%${qq}%,legajo.ilike.%${qq}%`);
    }
    if (estado) q = q.eq("estado", estado);
    if (nivel) q = q.eq("nivel", nivel);
    return q.order("created_at", { ascending: false }).range(from, to);
  };

  let { data, error, count } = await buildQuery(COLUMNS);
  if (error && isMissingColumnError(error)) {
    const fallback = await buildQuery(COLUMNS_LEGACY);
    data = fallback.data as typeof data;
    error = fallback.error;
    count = fallback.count;
  }
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (ComercioRow & {
    clientes?:
      | {
          legajo: string;
          nombre: string;
          cuit: string;
          tipo_persona: TipoPersona;
          correo: string;
        }[]
      | null;
    codigos_categoria?: { id: number; descripcion: string }[] | null;
    puntos_venta?: PuntoVentaRow[] | null;
  })[];

  return {
    rows: rows.map(toComercio),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getComercio(id: string): Promise<Comercio | null> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("comercios").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && isMissingColumnError(error)) {
    const fb = await sb.from("comercios").select(COLUMNS_LEGACY).eq("id", id).maybeSingle();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  if (!data) return null;
  return toComercio(
    data as ComercioRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: TipoPersona;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PuntoVentaRow[] | null;
    },
  );
}

export type ComercioCreateInput = ComercioInput;

export async function createComercio(input: ComercioCreateInput): Promise<Comercio> {
  const sb = requireSupabase();
  const tryInsert = async (withFlags: boolean) => {
    const payload: Record<string, unknown> = {
      usuario: input.usuario.trim(),
      legajo: input.legajo.trim(),
      categoria_id: input.categoriaId,
      nivel: input.nivel,
      estado: input.estado,
    };
    if (withFlags) {
      payload.habilitado_pago_transferencia = input.habilitadoPagoTransferencia ?? false;
      payload.habilitado_enlaces_pago = input.habilitadoEnlacesPago ?? false;
    }
    const cols = withFlags ? COLUMNS : COLUMNS_LEGACY;
    return sb.from("comercios").insert(payload).select(cols).single();
  };
  let { data, error } = await tryInsert(true);
  if (error && isMissingColumnError(error)) {
    const fb = await tryInsert(false);
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return toComercio(
    data as ComercioRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: TipoPersona;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PuntoVentaRow[] | null;
    },
  );
}

export type ComercioUpdateInput = Partial<ComercioInput>;

export async function updateComercio(id: string, input: ComercioUpdateInput): Promise<Comercio> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.usuario !== undefined) payload.usuario = input.usuario.trim();
  if (input.legajo !== undefined) payload.legajo = input.legajo.trim();
  if (input.categoriaId !== undefined) payload.categoria_id = input.categoriaId;
  if (input.nivel !== undefined) payload.nivel = input.nivel;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.habilitadoPagoTransferencia !== undefined)
    payload.habilitado_pago_transferencia = input.habilitadoPagoTransferencia;
  if (input.habilitadoEnlacesPago !== undefined) payload.habilitado_enlaces_pago = input.habilitadoEnlacesPago;

  let { data, error } = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS).single();
  if (error && isMissingColumnError(error)) {
    // reintenta sin flags si la columna no existe aún
    if ("habilitado_pago_transferencia" in payload) delete payload.habilitado_pago_transferencia;
    if ("habilitado_enlaces_pago" in payload) delete payload.habilitado_enlaces_pago;
    const fb = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS_LEGACY).single();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return toComercio(
    data as ComercioRow & {
      clientes?:
        | {
            legajo: string;
            nombre: string;
            cuit: string;
            tipo_persona: TipoPersona;
            correo: string;
          }[]
        | null;
      codigos_categoria?: { id: number; descripcion: string }[] | null;
      puntos_venta?: PuntoVentaRow[] | null;
    },
  );
}

export async function setComercioEstado(id: string, estado: EstadoComercio): Promise<Comercio> {
  return updateComercio(id, { estado });
}

export async function deleteComercio(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("comercios").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// --- catálogos auxiliares ---------------------------------------------------

// Legajo siempre es un cliente: el alta de comercio exige elegir un cliente
// existente (FK real a clientes.legajo). Esta lista alimenta el selector.
export async function listClientesForSelect(): Promise<ClienteSelect[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select("legajo, nombre, correo")
    .order("nombre", { ascending: true });
  if (error) throw new DataAccessError(error);
  return (data ?? []).map(
    (r: { legajo: string; nombre: string; correo: string }): ClienteSelect => ({
      legajo: r.legajo,
      nombre: r.nombre,
      correo: r.correo,
    }),
  );
}

export async function listPuntosVenta(comercioId: string): Promise<PuntoVenta[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("puntos_venta")
    .select("id, comercio_id, nombre, estado, created_at")
    .eq("comercio_id", comercioId)
    .order("created_at", { ascending: true });
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r: PuntoVentaRow) => toPuntoVenta(r));
}
