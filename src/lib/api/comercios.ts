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
  "id, usuario, legajo, categoria_id, estado, nivel, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at)";

function escapeLike(q: string): string {
  return q.trim().replace(/[%_]/g, "\\$&");
}

export async function listComercios(filters: ComercioFilters): Promise<Page<Comercio>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, nivel } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("comercios").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = escapeLike(search);
    query = query.or(`usuario.ilike.%${q}%,legajo.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (nivel) query = query.eq("nivel", nivel);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
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
  const { data, error } = await sb.from("comercios").select(COLUMNS).eq("id", id).maybeSingle();
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
  const { data, error } = await sb
    .from("comercios")
    .insert({
      usuario: input.usuario.trim(),
      legajo: input.legajo.trim(),
      categoria_id: input.categoriaId,
      nivel: input.nivel,
      estado: input.estado,
    })
    .select(COLUMNS)
    .single();
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

  const { data, error } = await sb
    .from("comercios")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
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
