import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toPuntoVenta } from "./mappers";
import type { Page, Pagination, PuntoVenta, PuntoVentaRow, EstadoQr } from "./types";

export type QrFilters = Pagination & {
  search?: string;
  estado?: EstadoQr;
  comercioId?: string;
};

const COLUMNS = "id, comercio_id, nombre, estado, created_at, tipo, cajero, qr_url, alias, comercios(id, usuario, legajo, clientes(nombre, correo))";
const COLUMNS_LEGACY = "id, comercio_id, nombre, estado, created_at, comercios(id, usuario, legajo, clientes(nombre, correo))";

function isMissingColumnError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? String(error);
  return /column.*does not exist|PGRST204|schema cache|tipo|cajero|qr_url|alias/i.test(msg);
}

export async function listQrPos(filters: QrFilters): Promise<Page<PuntoVenta>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, comercioId } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const build = async (cols: string, includeExtraSearch: boolean) => {
    let query = sb.from("puntos_venta").select(cols, { count: "exact" });
    if (search?.trim()) {
      const q = search.trim().replace(/[%_]/g, "\\$&");
      if (includeExtraSearch) {
        query = query.or(`nombre.ilike.%${q}%,cajero.ilike.%${q}%,alias.ilike.%${q}%`);
      } else {
        query = query.ilike("nombre", `%${q}%`);
      }
    }
    if (estado) query = query.eq("estado", estado);
    if (comercioId) query = query.eq("comercio_id", comercioId);
    query = query.order("created_at", { ascending: false }).range(from, to);
    return query;
  };

  let q = await build(COLUMNS, true);
  let { data, error, count } = await q;
  if (error && isMissingColumnError(error)) {
    const fb = await build(COLUMNS_LEGACY, false);
    const res = await fb;
    data = res.data as typeof data;
    error = res.error;
    count = res.count;
  }
  if (error) throw new DataAccessError(error);
  const rows = (data ?? []) as (PuntoVentaRow & { comercios?: { id: string; usuario: string; legajo: string; clientes?: { nombre: string; correo: string }[] | null } | null })[];
  return { rows: rows.map((r) => toPuntoVenta(r as never)), total: count ?? rows.length, page, pageSize };
}

export async function getQrPos(id: string): Promise<PuntoVenta | null> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("puntos_venta").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && isMissingColumnError(error)) {
    const fb = await sb.from("puntos_venta").select(COLUMNS_LEGACY).eq("id", id).maybeSingle();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return data ? toPuntoVenta(data as never) : null;
}

export async function updateQrEstado(id: string, estado: EstadoQr): Promise<PuntoVenta> {
  const sb = requireSupabase();
  let { data, error } = await sb.from("puntos_venta").update({ estado }).eq("id", id).select(COLUMNS).single();
  if (error && isMissingColumnError(error)) {
    const fb = await sb.from("puntos_venta").update({ estado }).eq("id", id).select(COLUMNS_LEGACY).single();
    data = fb.data as typeof data;
    error = fb.error;
  }
  if (error) throw new DataAccessError(error);
  return toPuntoVenta(data as never);
}

export async function deleteQrPos(id: string): Promise<void> {
  const sb = requireSupabase();
  // soft: marcar Eliminado en lugar de borrar fisico, para conservar relacion
  const { error } = await sb.from("puntos_venta").update({ estado: "Eliminado" }).eq("id", id);
  if (error) throw new DataAccessError(error);
}
