import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type {
MerchantBrand,
MerchantBrandStatus,
MerchantBrandRow,
} from "@/infrastructure/supabase/legacy/types";

const COLUMNS =
  "id, comercio_id, bandera, bandera_id, metodo_key, comision_molipay, comision_payway, comision_neta, estado, created_at, updated_at";

function toBrand(r: MerchantBrandRow): MerchantBrand {
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

export async function listByMerchant(merchantId: string): Promise<MerchantBrand[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas")
    .select(COLUMNS)
    .eq("comercio_id", merchantId)
    .order("bandera", { ascending: true });
  if (error) throw toAppError(error);
  return ((data ?? []) as MerchantBrandRow[]).map(toBrand);
}

export async function createBrand(
  merchantId: string,
  input: {
    bandera: string;
    comisionMolipay: number;
    comisionPayway: number;
    estado?: MerchantBrandStatus;
    banderaId?: string;
    metodoKey?: string;
  },
): Promise<MerchantBrand> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {
    comercio_id: merchantId,
    bandera: input.bandera.trim(),
    comision_molipay: input.comisionMolipay,
    comision_payway: input.comisionPayway,
    estado: input.estado ?? "Activo",
  };
  if (input.banderaId) payload.bandera_id = input.banderaId;
  if (input.metodoKey) payload.metodo_key = input.metodoKey;
  const { data, error } = await sb
    .from("comercio_banderas")
    .insert(payload)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toBrand(data as MerchantBrandRow);
}

export async function updateBrand(
  id: string,
  input: Partial<{
    bandera: string;
    comisionMolipay: number;
    comisionPayway: number;
    estado: MerchantBrandStatus;
    banderaId?: string;
    metodoKey?: string;
  }>,
): Promise<MerchantBrand> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.bandera !== undefined) payload.bandera = input.bandera.trim();
  if (input.comisionMolipay !== undefined) payload.comision_molipay = input.comisionMolipay;
  if (input.comisionPayway !== undefined) payload.comision_payway = input.comisionPayway;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.banderaId !== undefined) payload.bandera_id = input.banderaId || null;
  if (input.metodoKey !== undefined) payload.metodo_key = input.metodoKey || null;
  const { data, error } = await sb
    .from("comercio_banderas")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toBrand(data as MerchantBrandRow);
}

export async function deleteBrand(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("comercio_banderas").delete().eq("id", id);
  if (error) throw toAppError(error);
}

export async function setBrandStatus(
  id: string,
  status: MerchantBrandStatus,
): Promise<MerchantBrand> {
  return updateBrand(id, { estado: status });
}

export async function listBrandsByMerchantIds(merchantIds: string[]): Promise<MerchantBrand[]> {
  if (merchantIds.length === 0) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas")
    .select(COLUMNS)
    .in("comercio_id", merchantIds);
  if (error) throw toAppError(error);
  return ((data ?? []) as MerchantBrandRow[]).map(toBrand);
}
