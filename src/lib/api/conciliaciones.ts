import type { Page, Pagination } from "./types";

export type Conciliacion = {
  id: string;
  periodo: string;
  estado: "Pendiente" | "En progreso" | "Finalizada" | "Error";
  totalMovimientos: number;
  totalConciliados: number;
  createdAt: string;
};

/**
 * Placeholder de la capa de acceso a conciliaciones bancarias.
 *
 * El módulo de conciliaciones aún no tiene tabla en el esquema actual
 * (supabase/migrations/0001_init.sql). Cuando llegue el archivo real del banco, el
 * matching masivo debe correr como Edge Function programada (cron), no como lógica de
 * frontend. Este archivo deja la interfaz de la capa de datos lista para enchufar la
 * tabla/Edge Function real sin tocar los componentes que lo consuman.
 */
export async function listConciliaciones(
  _filters: Pagination = { page: 0, pageSize: 25 },
): Promise<Page<Conciliacion>> {
  return { rows: [], total: 0, page: _filters.page, pageSize: _filters.pageSize };
}
