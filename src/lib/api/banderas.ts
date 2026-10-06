import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

export type BanderaRow = {
  id: string;
  nombre: string;
  tipo: string;
  metodo_key: string | null;
  dias_habiles_acreditacion: number;
  estado: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Bandera = {
  id: string;
  nombre: string;
  tipo: string;
  metodoKey: string | null;
  diasHabilesAcreditacion: number;
  estado: "Activo" | "Inactivo";
  createdAt: string;
  updatedAt: string;
};

export type BanderaCuotaRow = {
  id: string;
  bandera_id: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: string;
};

export type BanderaCuota = {
  id: string;
  banderaId: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: "Activo" | "Inactivo";
};

const BANDERA_COLUMNS = "id, nombre, tipo, metodo_key, dias_habiles_acreditacion, estado, created_at, updated_at";
const BANDERA_CUOTA_COLUMNS = "id, bandera_id, cuotas, ten, coeficiente, estado";

function toBandera(r: BanderaRow): Bandera {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    metodoKey: r.metodo_key ?? null,
    diasHabilesAcreditacion: r.dias_habiles_acreditacion,
    estado: r.estado as Bandera["estado"],
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

function toBanderaCuota(r: BanderaCuotaRow): BanderaCuota {
  return {
    id: r.id,
    banderaId: r.bandera_id,
    cuotas: r.cuotas,
    ten: Number(r.ten),
    coeficiente: Number(r.coeficiente),
    estado: r.estado as BanderaCuota["estado"],
  };
}

export async function listBanderas(estado?: string): Promise<Bandera[]> {
  const sb = requireSupabase();
  let query = sb.from("banderas").select(BANDERA_COLUMNS).order("nombre", { ascending: true });
  if (estado) {
    query = query.eq("estado", estado);
  }
  const { data, error } = await query;
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BanderaRow[]).map(toBandera);
}

export async function getBandera(id: string): Promise<Bandera | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("banderas").select(BANDERA_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toBandera(data as BanderaRow) : null;
}

export async function createBandera(input: { nombre: string; tipo: string; diasHabilesAcreditacion: number; estado?: string }): Promise<Bandera> {
  const sb = requireSupabase();
  const payload = {
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    dias_habiles_acreditacion: input.diasHabilesAcreditacion,
    estado: input.estado ?? "Activo",
  };
  const { data, error } = await sb.from("banderas").insert(payload).select(BANDERA_COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBandera(data as BanderaRow);
}

export async function updateBandera(
  id: string,
  input: Partial<{ nombre: string; tipo: string; diasHabilesAcreditacion: number; estado: string }>,
): Promise<Bandera> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.diasHabilesAcreditacion !== undefined) payload.dias_habiles_acreditacion = input.diasHabilesAcreditacion;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb.from("banderas").update(payload).eq("id", id).select(BANDERA_COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBandera(data as BanderaRow);
}

export async function deleteBandera(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function listCuotasByBandera(banderaId: string): Promise<BanderaCuota[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas_cuotas")
    .select(BANDERA_CUOTA_COLUMNS)
    .eq("bandera_id", banderaId)
    .order("cuotas", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BanderaCuotaRow[]).map(toBanderaCuota);
}

export async function createBanderaCuota(
  input: { banderaId: string; cuotas: number; ten?: number; coeficiente?: number; estado?: string },
): Promise<BanderaCuota> {
  const sb = requireSupabase();
  const payload = {
    bandera_id: input.banderaId,
    cuotas: input.cuotas,
    ten: input.ten ?? 0,
    coeficiente: input.coeficiente ?? 1,
    estado: input.estado ?? "Activo",
  };
  const { data, error } = await sb.from("banderas_cuotas").insert(payload).select(BANDERA_CUOTA_COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBanderaCuota(data as BanderaCuotaRow);
}

export async function updateBanderaCuota(
  id: string,
  input: Partial<{ cuotas: number; ten: number; coeficiente: number; estado: string }>,
): Promise<BanderaCuota> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.cuotas !== undefined) payload.cuotas = input.cuotas;
  if (input.ten !== undefined) payload.ten = input.ten;
  if (input.coeficiente !== undefined) payload.coeficiente = input.coeficiente;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb.from("banderas_cuotas").update(payload).eq("id", id).select(BANDERA_CUOTA_COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBanderaCuota(data as BanderaCuotaRow);
}

export async function deleteBanderaCuota(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas_cuotas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function getBanderaByNombre(nombre: string): Promise<Bandera | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("banderas").select(BANDERA_COLUMNS).eq("nombre", nombre).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toBandera(data as BanderaRow) : null;
}
