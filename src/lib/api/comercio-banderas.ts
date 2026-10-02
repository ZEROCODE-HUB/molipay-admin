import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { ComercioBandera, ComercioBanderaEstado, ComercioBanderaRow } from "./types";

const COLUMNS = "id, comercio_id, bandera, comision_molipay, comision_payway, comision_neta, estado, created_at, updated_at";

function toBandera(r: ComercioBanderaRow): ComercioBandera {
  return {
    id: r.id,
    comercioId: r.comercio_id,
    bandera: r.bandera,
    banderaId: r.bandera_id ?? null,
    metodoKey: r.metodo_key ?? null,
    comisionMolipay: Number(r.comision_molipay),
    comisionPayway: Number(r.comision_payway),
    comisionNeta: Number(r.comision_neta),
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listByComercio(comercioId: string): Promise<ComercioBandera[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas")
    .select(COLUMNS)
    .eq("comercio_id", comercioId)
    .order("bandera", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as ComercioBanderaRow[]).map(toBandera);
}

export async function createBandera(
  comercioId: string,
  input: { bandera: string; comisionMolipay: number; comisionPayway: number; estado?: ComercioBanderaEstado; banderaId?: string; metodoKey?: string },
): Promise<ComercioBandera> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    comercio_id: comercioId,
    bandera: input.bandera.trim(),
    comision_molipay: input.comisionMolipay,
    comision_payway: input.comisionPayway,
    estado: input.estado ?? "Activo",
  };
  if (input.banderaId) payload.bandera_id = input.banderaId;
  if (input.metodoKey) payload.metodo_key = input.metodoKey;
  const { data, error } = await sb.from("comercio_banderas").insert(payload).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBandera(data as ComercioBanderaRow);
}

export async function updateBandera(
  id: string,
  input: Partial<{ bandera: string; comisionMolipay: number; comisionPayway: number; estado: ComercioBanderaEstado; banderaId?: string; metodoKey?: string }>,
): Promise<ComercioBandera> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.bandera !== undefined) payload.bandera = input.bandera.trim();
  if (input.comisionMolipay !== undefined) payload.comision_molipay = input.comisionMolipay;
  if (input.comisionPayway !== undefined) payload.comision_payway = input.comisionPayway;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.banderaId !== undefined) payload.bandera_id = input.banderaId || null;
  if (input.metodoKey !== undefined) payload.metodo_key = input.metodoKey || null;
  const { data, error } = await sb.from("comercio_banderas").update(payload).eq("id", id).select(COLUMNS).single();
  if (error) throw new DataAccessError(error);
  return toBandera(data as ComercioBanderaRow);
}

export async function deleteBandera(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("comercio_banderas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function setBanderaEstado(id: string, estado: ComercioBanderaEstado): Promise<ComercioBandera> {
  return updateBandera(id, { estado });
}

export async function listBanderasByComercioIds(comercioIds: string[]): Promise<ComercioBandera[]> {
  if (comercioIds.length === 0) return [];
  const sb = requireSupabase();
  const { data, error } = await sb.from("comercio_banderas").select(COLUMNS).in("comercio_id", comercioIds);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as ComercioBanderaRow[]).map(toBandera);
}
