import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import type {
MerchantBrandInstallment,
MerchantBrandInstallmentRow,
} from "@/infrastructure/supabase/legacy/types";

const COLUMNS = "id, comercio_bandera_id, cuotas, tasa_mensual, estado";

function toMerchantBrandInstallment(r: MerchantBrandInstallmentRow): MerchantBrandInstallment {
  return {
    id: r.id,
    comercioBanderaId: r.comercio_bandera_id,
    cuotas: r.cuotas,
    tasaMensual: Number(r.tasa_mensual),
    estado: r.estado as MerchantBrandInstallment["estado"],
  };
}

export async function listInstallmentsByMerchantBrand(
  merchantBrandId: string,
): Promise<MerchantBrandInstallment[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comercio_banderas_cuotas")
    .select(COLUMNS)
    .eq("comercio_bandera_id", merchantBrandId)
    .order("cuotas", { ascending: true });
  if (error) throw toAppError(error);
  return ((data ?? []) as MerchantBrandInstallmentRow[]).map(toMerchantBrandInstallment);
}

export async function createMerchantBrandInstallment(input: {
  comercioBanderaId: string;
  cuotas: number;
  tasaMensual: number;
  estado?: "Activo" | "Inactivo";
}): Promise<MerchantBrandInstallment> {
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
  if (error) throw toAppError(error);
  return toMerchantBrandInstallment(data as MerchantBrandInstallmentRow);
}

export async function updateMerchantBrandInstallment(
  id: string,
  input: Partial<{ cuotas: number; tasaMensual: number; estado: "Activo" | "Inactivo" }>,
): Promise<MerchantBrandInstallment> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.cuotas !== undefined) payload.cuotas = input.cuotas;
  if (input.tasaMensual !== undefined) payload.tasa_mensual = input.tasaMensual;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb
    .from("comercio_banderas_cuotas")
    .update(payload)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toMerchantBrandInstallment(data as MerchantBrandInstallmentRow);
}

export async function deleteMerchantBrandInstallment(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("comercio_banderas_cuotas").delete().eq("id", id);
  if (error) throw toAppError(error);
}
