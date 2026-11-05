import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";
import type { Integration,IntegrationFilters,IntegrationPage } from "./integrations.types";

/*
 * Feature chica sin contrato: hoy solo se lista. Lo usa solo integrations.queries.ts.
 * (createIntegracion / updateIntegracion de lib/api no las usaba ninguna pantalla.)
 */

type IntegrationRow = { id: string; nombre: string; proveedor: string; created_at: string };

export const toIntegration = (r: IntegrationRow): Integration => ({
  id: r.id,
  name: r.nombre,
  provider: r.proveedor,
  createdAt: r.created_at,
});

export async function listIntegrations(
  { page, pageSize, search }: IntegrationFilters,
  { signal }: { signal?: AbortSignal } = {},
): Promise<IntegrationPage> {
  const from = page * pageSize;
  let query = requireSupabase()
    .from("integraciones")
    .select("id, nombre, proveedor, created_at", { count: "exact" });
  if (search?.trim()) {
    const q = escapeLike(search);
    query = query.or(`id.ilike.%${q}%,nombre.ilike.%${q}%,proveedor.ilike.%${q}%`);
  }
  query = query.order("id", { ascending: true }).range(from, from + pageSize - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error, count } = await query;
  if (error) throw toAppError(error, { feature: "system", operation: "integraciones" });
  const rows = ((data ?? []) as IntegrationRow[]).map(toIntegration);
  return { rows, total: count ?? rows.length, page, pageSize };
}
