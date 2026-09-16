import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { ComercioBanderaCuota, ComercioBanderaCuotaRow } from "./types";

const COLUMNS = "id, comercio_bandera_id, cuotas, tasa_mensual, estado";

function toComercioBanderaCuota(r: ComercioBanderaCuotaRow): ComercioBanderaCuota {
  return {
    id: r.id,
    comercioBanderaId: r.comercio_bandera_id,
    cuotas: r.cuotas,
    tasaMensual: Number(r.tasa_mensual),
    estado: r.estado as ComercioBanderaCuota["estado"],
  };
}

export async function listCuotasByComercioBandera(comercioBanderaId: string): Promise<ComercioBanderaCuota[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas_cuotas")
    .select(COLUMNS)
    .eq("comercio_bandera_id", comercioBanderaId)
    .order("cuotas", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as ComercioBanderaCuotaRow[]).map(toComercioBanderaCuota);
}

export async function createComercioBanderaCuota(input: {
  comercioBanderaId: string;
  cuotas: number;
  tasaMensual: number;
  estado?: "Activo" | "Inactivo";
}): Promise<ComercioBanderaCuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas_cuotas")
    .insert({
      comercio_bandera_id: input.comercioBanderaId,
      cuotas: input.cuotas,
      tasa_mensual: input.tasaMensual,
      estado: input.estado ?? "Activo",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toComercioBanderaCuota(data as ComercioBanderaCuotaRow);
}

export async function updateComercioBanderaCuota(
  id: string,
  input: Partial<{ cuotas: number; tasaMensual: number; estado: "Activo" | "Inactivo" }>,
): Promise<ComercioBanderaCuota> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.cuotas !== undefined) payload.cuotas = input.cuotas;
  if (input.tasaMensual !== undefined) payload.tasa_mensual = input.tasaMensual;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb.from("comercio_banderas_cuotas").update(payload).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toComercioBanderaCuota(data as ComercioBanderaCuotaRow);
}

export async function deleteComercioBanderaCuota(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("comercio_banderas_cuotas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
