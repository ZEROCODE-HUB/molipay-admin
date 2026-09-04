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

export async function listQrPos(filters: QrFilters): Promise<Page<PuntoVenta>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, comercioId } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("puntos_venta").select(COLUMNS, { count: "exact" });
  if (search?.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    // buscar por nombre QR/POS, comercio usuario/legajo, cajero
    query = query.or(`nombre.ilike.%${q}%,cajero.ilike.%${q}%,alias.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (comercioId) query = query.eq("comercio_id", comercioId);
  // no mostrar eliminados por defecto? se muestran si filtro lo pide
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);
  const rows = (data ?? []) as (PuntoVentaRow & { comercios?: { id: string; usuario: string; legajo: string; clientes?: { nombre: string; correo: string }[] | null } | null })[];
  return { rows: rows.map((r) => toPuntoVenta(r as never)), total: count ?? rows.length, page, pageSize };
}

export async function getQrPos(id: string): Promise<PuntoVenta | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("puntos_venta").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toPuntoVenta(data as never) : null;
}

export async function updateQrEstado(id: string, estado: EstadoQr): Promise<PuntoVenta> {
  // Admin no puede activar manualmente (Payway). Validar.
  if (estado === "Activado") throw new Error("La activación la realiza Payway. El administrador no puede activar manualmente.");
  const sb = requireSupabase();
  const { data, error } = await sb.from("puntos_venta").update({ estado }).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toPuntoVenta(data as never);
}

export async function deleteQrPos(id: string): Promise<void> {
  const sb = requireSupabase();
  // soft: marcar Eliminado en lugar de borrar fisico, para conservar relacion
  const { error } = await sb.from("puntos_venta").update({ estado: "Eliminado" }).eq("id", id);
  if (error) throw new DataAccessError(error);
}
