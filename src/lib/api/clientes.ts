import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toCliente } from "./mappers";
import type { Cliente, ClienteRow, EstadoCliente, Page, Pagination, TipoPersona } from "./types";

export type ClienteFilters = Pagination & {
  /** Búsqueda de texto libre: legajo, correo o nombre (ilike server-side). */
  search?: string;
  estado?: EstadoCliente;
  tipoPersona?: TipoPersona;
};

const COLUMNS =
  "id, legajo, tipo_persona, correo, nombre, cuit, estado, fecha_alta, created_at, updated_at";

export async function listClientes(filters: ClienteFilters): Promise<Page<Cliente>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, tipoPersona } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("clientes").select(COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`legajo.ilike.%${q}%,correo.ilike.%${q}%,nombre.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (tipoPersona) query = query.eq("tipo_persona", tipoPersona);

  query = query.order("fecha_alta", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as ClienteRow[];
  return { rows: rows.map(toCliente), total: count ?? rows.length, page, pageSize };
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("clientes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByLegajo(legajo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("legajo", legajo.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export async function getClienteByCorreo(correo: string): Promise<Cliente | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .select(COLUMNS)
    .eq("correo", correo.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toCliente(data as ClienteRow) : null;
}

export type ClienteInput = {
  tipoPersona: TipoPersona;
  correo: string;
  nombre: string;
  cuit: string;
  estado?: EstadoCliente;
  fechaAlta?: string;
};

/** El legajo se deriva del CUIT vía trigger `handle_new_cliente` (la DB es la fuente de verdad). */
export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .insert({
      tipo_persona: input.tipoPersona,
      correo: input.correo,
      nombre: input.nombre,
      cuit: input.cuit,
      estado: input.estado ?? "activo",
      fecha_alta: input.fechaAlta ?? new Date().toISOString().slice(0, 10),
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}

export async function updateClienteEstado(id: string, estado: EstadoCliente): Promise<Cliente> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("clientes")
    .update({ estado })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toCliente(data as ClienteRow);
}
