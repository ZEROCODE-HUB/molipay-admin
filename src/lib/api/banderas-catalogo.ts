import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

// ============================================================================
// BANDERAS (catálogo)
// ============================================================================

export type BanderaCatalogo = {
  id: string;
  nombre: string;
  diasHabilesAcreditacion: number;
  estado: "Activo" | "Inactivo";
};

export type BanderaCatalogoRow = {
  id: string;
  nombre: string;
  dias_habiles_acreditacion: number;
  estado: string;
};

function toBanderaCatalogo(r: BanderaCatalogoRow): BanderaCatalogo {
  return {
    id: r.id,
    nombre: r.nombre,
    diasHabilesAcreditacion: r.dias_habiles_acreditacion,
    estado: r.estado as BanderaCatalogo["estado"],
  };
}

export async function listBanderasCatalogo(): Promise<BanderaCatalogo[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas")
    .select("id, nombre, dias_habiles_acreditacion, estado")
    .order("nombre", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BanderaCatalogoRow[]).map(toBanderaCatalogo);
}

export async function createBanderaCatalogo(input: {
  nombre: string;
  diasHabilesAcreditacion: number;
  estado?: "Activo" | "Inactivo";
}): Promise<BanderaCatalogo> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas")
    .insert({
      nombre: input.nombre.trim(),
      dias_habiles_acreditacion: input.diasHabilesAcreditacion,
      estado: input.estado ?? "Activo",
    })
    .select("id, nombre, dias_habiles_acreditacion, estado")
    .single();
  if (error) throw new DataAccessError(error);
  return toBanderaCatalogo(data as BanderaCatalogoRow);
}

export async function updateBanderaCatalogo(
  id: string,
  input: Partial<{ nombre: string; diasHabilesAcreditacion: number; estado: "Activo" | "Inactivo" }>,
): Promise<BanderaCatalogo> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.diasHabilesAcreditacion !== undefined) payload.dias_habiles_acreditacion = input.diasHabilesAcreditacion;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb.from("banderas").update(payload).eq("id", id).select("id, nombre, dias_habiles_acreditacion, estado").single();
  if (error) throw new DataAccessError(error);
  return toBanderaCatalogo(data as BanderaCatalogoRow);
}

export async function deleteBanderaCatalogo(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// BANDERAS_CUOTAS (catálogo)
// ============================================================================

export type BanderaCuota = {
  id: string;
  banderaId: string;
  cuotas: number;
  estado: "Activo" | "Inactivo";
};

export type BanderaCuotaRow = {
  id: string;
  bandera_id: string;
  cuotas: number;
  estado: string;
};

function toBanderaCuota(r: BanderaCuotaRow): BanderaCuota {
  return {
    id: r.id,
    banderaId: r.bandera_id,
    cuotas: r.cuotas,
    estado: r.estado as BanderaCuota["estado"],
  };
}

export async function listBanderasCuotas(banderaId: string): Promise<BanderaCuota[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas_cuotas")
    .select("id, bandera_id, cuotas, estado")
    .eq("bandera_id", banderaId)
    .order("cuotas", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BanderaCuotaRow[]).map(toBanderaCuota);
}

export async function listAllBanderasCuotas(): Promise<BanderaCuota[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas_cuotas")
    .select("id, bandera_id, cuotas, estado")
    .order("cuotas", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BanderaCuotaRow[]).map(toBanderaCuota);
}

export async function createBanderaCuota(input: {
  banderaId: string;
  cuotas: number;
  estado?: "Activo" | "Inactivo";
}): Promise<BanderaCuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas_cuotas")
    .insert({
      bandera_id: input.banderaId,
      cuotas: input.cuotas,
      estado: input.estado ?? "Activo",
    })
    .select("id, bandera_id, cuotas, estado")
    .single();
  if (error) throw new DataAccessError(error);
  return toBanderaCuota(data as BanderaCuotaRow);
}

export async function updateBanderaCuota(
  id: string,
  input: Partial<{ cuotas: number; estado: "Activo" | "Inactivo" }>,
): Promise<BanderaCuota> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.cuotas !== undefined) payload.cuotas = input.cuotas;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb.from("banderas_cuotas").update(payload).eq("id", id).select("id, bandera_id, cuotas, estado").single();
  if (error) throw new DataAccessError(error);
  return toBanderaCuota(data as BanderaCuotaRow);
}

export async function deleteBanderaCuota(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas_cuotas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
