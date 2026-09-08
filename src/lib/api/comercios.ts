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
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
};

// legajo es FK real a clientes.legajo -> la relación embebida se llama `clientes`.
const COLUMNS =
  "id, usuario, legajo, categoria_id, estado, nivel, habilitado_pago_transferencia, habilitado_enlaces_pago, metodos_config, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at)";
const COLUMNS_LEGACY =
  "id, usuario, legajo, categoria_id, estado, nivel, created_at, updated_at, clientes(legajo, nombre, cuit, tipo_persona, correo), codigos_categoria(id, codigo, nombre, descripcion, estado), puntos_venta(id, nombre, estado, created_at)";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /habilitado_pago_transferencia|habilitado_enlaces_pago|metodos_config|column.*does not exist|PGRST204|schema cache/i.test(msg);
}

function persistLocalMetodos(comercioId: string, metodos: unknown) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`comercio_metodos_${comercioId}`, JSON.stringify(metodos ?? []));
    }
  } catch {
    // ignore
  }
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
    if (filters.fechaDesde) q = q.gte("created_at", filters.fechaDesde);
    if (filters.fechaHasta) q = q.lte("created_at", filters.fechaHasta + "T23:59:59");
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
  const metodosPayload = (input.metodosConfig ?? []).map((m) => ({
    metodoId: m.metodoId,
    metodoNombre: m.metodoNombre,
    tipo: m.tipo,
    comisionMolipay: m.comisionMolipay,
    comisionPayway: m.comisionPayway,
    comisionNeta: m.comisionMolipay - m.comisionPayway,
  }));
  const tryInsert = async (withFlags: boolean, withMetodos: boolean) => {
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
    if (withMetodos) payload.metodos_config = metodosPayload;
    const cols = withMetodos ? COLUMNS : withFlags ? COLUMNS.replace(", metodos_config", "") : COLUMNS_LEGACY;
    return sb.from("comercios").insert(payload).select(cols).single();
  };
  let { data, error } = await tryInsert(true, true);
  if (error && isMissingColumnError(error)) {
    // reintenta sin metodos_config si no existe columna
    const retry = await tryInsert(true, false);
    data = retry.data as typeof data;
    error = retry.error;
    if (!error && data) persistLocalMetodos((data as ComercioRow).id, metodosPayload);
    if (error && isMissingColumnError(error)) {
      const fb = await tryInsert(false, false);
      data = fb.data as typeof data;
      error = fb.error;
      if (!error && data) persistLocalMetodos((data as ComercioRow).id, metodosPayload);
    }
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
  if (input.metodosConfig !== undefined) {
    const metodosPayload = input.metodosConfig.map((m) => ({
      metodoId: m.metodoId,
      metodoNombre: m.metodoNombre,
      tipo: m.tipo,
      comisionMolipay: m.comisionMolipay,
      comisionPayway: m.comisionPayway,
      comisionNeta: m.comisionMolipay - m.comisionPayway,
    }));
    payload.metodos_config = metodosPayload;
    // persist local always as backup
    persistLocalMetodos(id, metodosPayload);
  }

  let { data, error } = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS).single();
  if (error && isMissingColumnError(error)) {
    // reintenta sin metodos_config y luego sin flags si la columna no existe aún
    const hasMetodos = "metodos_config" in payload;
    if (hasMetodos) {
      const metodosBackup = payload.metodos_config;
      delete payload.metodos_config;
      const retry = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS.replace(", metodos_config", "")).single();
      data = retry.data as typeof data;
      error = retry.error;
      if (!error) persistLocalMetodos(id, metodosBackup);
      else if (isMissingColumnError(error)) {
        if ("habilitado_pago_transferencia" in payload) delete payload.habilitado_pago_transferencia;
        if ("habilitado_enlaces_pago" in payload) delete payload.habilitado_enlaces_pago;
        const fb = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS_LEGACY).single();
        data = fb.data as typeof data;
        error = fb.error;
        if (!error) persistLocalMetodos(id, metodosBackup);
      }
    } else {
      if ("habilitado_pago_transferencia" in payload) delete payload.habilitado_pago_transferencia;
      if ("habilitado_enlaces_pago" in payload) delete payload.habilitado_enlaces_pago;
      const fb = await sb.from("comercios").update(payload).eq("id", id).select(COLUMNS_LEGACY).single();
      data = fb.data as typeof data;
      error = fb.error;
    }
  }
  if (error) throw new DataAccessError(error);
  // merge local fallback if DB didn't store metodos_config
  const result = toComercio(
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
  // si input traía metodos y DB no los devolvió, usa input
  if (input.metodosConfig !== undefined && result.metodosConfig.length === 0 && input.metodosConfig.length > 0) {
    result.metodosConfig = input.metodosConfig.map((m) => ({
      ...m,
      comisionNeta: m.comisionMolipay - m.comisionPayway,
    }));
  }
  return result;
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
// existente (FK real a clientes.legajo). Selector con búsqueda server-side + limit.
export async function listClientesForSelect(search?: string): Promise<ClienteSelect[]> {
  const sb = requireSupabase();
  let query = sb.from("clientes").select("legajo, nombre, correo, cuit, tipo_persona").order("nombre", { ascending: true }).limit(20);
  if (search?.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`legajo.ilike.%${q}%,correo.ilike.%${q}%,nombre.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new DataAccessError(error);
  return (data ?? []).map(
    (r: { legajo: string; nombre: string; correo: string; cuit: string; tipo_persona: string }): ClienteSelect => ({
      legajo: r.legajo,
      nombre: r.nombre,
      correo: r.correo,
      cuit: r.cuit,
      tipoPersona: r.tipo_persona as ClienteSelect["tipoPersona"],
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
