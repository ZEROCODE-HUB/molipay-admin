import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

export type EstadoEnlace = "Pendiente de aprobación" | "Pendiente de aprobacion" | "Activado" | "Desactivado" | "Rechazado" | "Suspendido" | "Eliminado" | "Activo" | "Inactivo";
export const ESTADOS_ENLACE: EstadoEnlace[] = ["Pendiente de aprobación","Activado","Desactivado","Rechazado","Suspendido","Eliminado"];

export type EnlacePagoRow = {
  id: string;
  cliente_legajo: string;
  comercio_nombre: string;
  url: string | null;
  monto: number | null;
  estado: string | null;
  referencia: string | null;
  notas: string | null;
  expira_en: string | null;
  pagos_parciales: boolean | null;
  metodos_pago: string[] | null;
  vistas: number | null;
  pagos: number | null;
  cajero: string | null;
  created_at: string;
  updated_at?: string;
  // joins
  clientes?: { correo: string; nombre: string }[] | null;
};

export type EnlacePago = {
  id: string;
  clienteLegajo: string;
  comercioNombre: string;
  url: string | null;
  monto: number | null;
  estado: string;
  referencia: string | null;
  notas: string | null;
  expiraEn: string | null;
  pagosParciales: boolean;
  metodosPago: string[] | null;
  vistas: number;
  pagos: number;
  cajero: string | null;
  createdAt: string;
  usuario?: string;
  clienteNombre?: string;
};

function toEnlace(r: EnlacePagoRow): EnlacePago {
  const cli = Array.isArray(r.clientes) ? r.clientes[0] : null;
  return {
    id: r.id,
    clienteLegajo: r.cliente_legajo,
    comercioNombre: r.comercio_nombre,
    url: r.url,
    monto: r.monto == null ? null : Number(r.monto),
    estado: normalizeEstado(r.estado),
    referencia: r.referencia,
    notas: r.notas,
    expiraEn: r.expira_en,
    pagosParciales: !!r.pagos_parciales,
    metodosPago: r.metodos_pago,
    vistas: Number(r.vistas ?? 0),
    pagos: Number(r.pagos ?? 0),
    cajero: r.cajero,
    createdAt: r.created_at,
    usuario: cli?.correo ?? undefined,
    clienteNombre: cli?.nombre ?? undefined,
  };
}

function normalizeEstado(raw: string | null): string {
  if (!raw) return "Pendiente de aprobación";
  if (raw === "Pendiente de aprobacion") return "Pendiente de aprobación";
  if (raw === "Activo") return "Activado";
  if (raw === "Inactivo") return "Desactivado";
  return raw;
}

export type EnlaceFilters = Pagination & {
  search?: string;
  estado?: string;
};

const COLUMNS = "id, cliente_legajo, comercio_nombre, url, monto, estado, referencia, notas, expira_en, pagos_parciales, metodos_pago, vistas, pagos, cajero, created_at, updated_at, clientes(correo, nombre)";
const COLUMNS_LEGACY = "id, cliente_legajo, comercio_nombre, url, monto, estado, created_at, clientes(correo, nombre)";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /column.*does not exist|PGRST204|schema cache|cajero|referencia|notas|expira_en|pagos_parciales|metodos_pago|vistas|pagos/i.test(msg);
}

export async function listEnlaces(filters: EnlaceFilters): Promise<Page<EnlacePago>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const build = (cols: string, withRefSearch: boolean) => {
    let query = sb.from("cliente_links_pago").select(cols, { count: "exact" });
    if (search?.trim()) {
      const q = search.trim().replace(/[%_]/g, "\\$&");
      if (withRefSearch) {
        query = query.or(`url.ilike.%${q}%,comercio_nombre.ilike.%${q}%,cliente_legajo.ilike.%${q}%,referencia.ilike.%${q}%`);
      } else {
        query = query.or(`url.ilike.%${q}%,comercio_nombre.ilike.%${q}%,cliente_legajo.ilike.%${q}%`);
      }
    }
    if (estado) query = query.eq("estado", estado);
    query = query.order("created_at", { ascending: false }).range(from, to);
    return query;
  };

  let { data, error, count } = await build(COLUMNS, true);
  if (error && isMissingColumnError(error)) {
    const fb = await build(COLUMNS_LEGACY, false);
    const res = await fb;
    data = res.data as typeof data;
    error = res.error;
    count = res.count;
  }
  if (error) throw new DataAccessError(error);
  const rows = (data ?? []) as EnlacePagoRow[];
  return { rows: rows.map(toEnlace), total: count ?? rows.length, page, pageSize };
}

export async function getEnlace(id: string): Promise<EnlacePago | null> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("cliente_links_pago").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && isMissingColumnError(error)) {
    const fb = await sb.from("cliente_links_pago").select(COLUMNS_LEGACY).eq("id", id).maybeSingle();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return data ? toEnlace(data as EnlacePagoRow) : null;
}

export async function updateEnlaceEstado(id: string, estado: string): Promise<EnlacePago> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("cliente_links_pago").update({ estado }).eq("id", id).select(COLUMNS).single();
  if (error && isMissingColumnError(error)) {
    const fb = await sb.from("cliente_links_pago").update({ estado }).eq("id", id).select(COLUMNS_LEGACY).single();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return toEnlace(data as EnlacePagoRow);
}

export async function deleteEnlace(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("cliente_links_pago").update({ estado: "Eliminado" }).eq("id", id);
  if (error) throw new DataAccessError(error);
}
