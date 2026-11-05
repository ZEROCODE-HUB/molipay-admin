import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

export type BrandRow = {
  id: string;
  nombre: string;
  tipo: string;
  metodo_key: string | null;
  dias_habiles_acreditacion: number;
  estado: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Brand = {
  id: string;
  nombre: string;
  tipo: string;
  metodoKey: string | null;
  diasHabilesAcreditacion: number;
  estado: "Activo" | "Inactivo";
  createdAt: string;
  updatedAt: string;
};

export type BrandInstallmentRow = {
  id: string;
  bandera_id: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: string;
};

export type BrandInstallment = {
  id: string;
  banderaId: string;
  cuotas: number;
  ten: number;
  coeficiente: number;
  estado: "Activo" | "Inactivo";
};

const BRAND_COLUMNS =
  "id, nombre, tipo, metodo_key, dias_habiles_acreditacion, estado, created_at, updated_at";
const BRAND_INSTALLMENT_COLUMNS = "id, bandera_id, cuotas, ten, coeficiente, estado";

function toBrand(r: BrandRow): Brand {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    metodoKey: r.metodo_key ?? null,
    diasHabilesAcreditacion: r.dias_habiles_acreditacion,
    estado: r.estado as Brand["estado"],
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

function toBrandInstallment(r: BrandInstallmentRow): BrandInstallment {
  return {
    id: r.id,
    banderaId: r.bandera_id,
    cuotas: r.cuotas,
    ten: Number(r.ten),
    coeficiente: Number(r.coeficiente),
    estado: r.estado as BrandInstallment["estado"],
  };
}

export async function listBrands(status?: string): Promise<Brand[]> {
  const sb = requireSupabase();
  let query = sb.from("banderas").select(BRAND_COLUMNS).order("nombre", { ascending: true });
  if (status) {
    query = query.eq("estado", status);
  }
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return ((data ?? []) as BrandRow[]).map(toBrand);
}

export async function getBrand(id: string): Promise<Brand | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas")
    .select(BRAND_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toBrand(data as BrandRow) : null;
}

export async function createBrand(input: {
  nombre: string;
  tipo: string;
  diasHabilesAcreditacion: number;
  estado?: string;
}): Promise<Brand> {
  const sb = requireSupabase();
  const payload = {
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    dias_habiles_acreditacion: input.diasHabilesAcreditacion,
    estado: input.estado ?? "Activo",
  };
  const { data, error } = await sb.from("banderas").insert(payload).select(BRAND_COLUMNS).single();
  if (error) throw toAppError(error);
  return toBrand(data as BrandRow);
}

export async function updateBrand(
  id: string,
  input: Partial<{ nombre: string; tipo: string; diasHabilesAcreditacion: number; estado: string }>,
): Promise<Brand> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.diasHabilesAcreditacion !== undefined)
    payload.dias_habiles_acreditacion = input.diasHabilesAcreditacion;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb
    .from("banderas")
    .update(payload)
    .eq("id", id)
    .select(BRAND_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toBrand(data as BrandRow);
}

export async function deleteBrand(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas").delete().eq("id", id);
  if (error) throw toAppError(error);
}

export async function listInstallmentsByBrand(brandId: string): Promise<BrandInstallment[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas_cuotas")
    .select(BRAND_INSTALLMENT_COLUMNS)
    .eq("bandera_id", brandId)
    .order("cuotas", { ascending: true });
  if (error) throw toAppError(error);
  return ((data ?? []) as BrandInstallmentRow[]).map(toBrandInstallment);
}

export async function createBrandInstallment(input: {
  banderaId: string;
  cuotas: number;
  ten?: number;
  coeficiente?: number;
  estado?: string;
}): Promise<BrandInstallment> {
  const sb = requireSupabase();
  const payload = {
    bandera_id: input.banderaId,
    cuotas: input.cuotas,
    ten: input.ten ?? 0,
    coeficiente: input.coeficiente ?? 1,
    estado: input.estado ?? "Activo",
  };
  const { data, error } = await sb
    .from("banderas_cuotas")
    .insert(payload)
    .select(BRAND_INSTALLMENT_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toBrandInstallment(data as BrandInstallmentRow);
}

export async function updateBrandInstallment(
  id: string,
  input: Partial<{ cuotas: number; ten: number; coeficiente: number; estado: string }>,
): Promise<BrandInstallment> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.cuotas !== undefined) payload.cuotas = input.cuotas;
  if (input.ten !== undefined) payload.ten = input.ten;
  if (input.coeficiente !== undefined) payload.coeficiente = input.coeficiente;
  if (input.estado !== undefined) payload.estado = input.estado;
  const { data, error } = await sb
    .from("banderas_cuotas")
    .update(payload)
    .eq("id", id)
    .select(BRAND_INSTALLMENT_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toBrandInstallment(data as BrandInstallmentRow);
}

export async function deleteBrandInstallment(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("banderas_cuotas").delete().eq("id", id);
  if (error) throw toAppError(error);
}

export async function getBrandByName(name: string): Promise<Brand | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("banderas")
    .select(BRAND_COLUMNS)
    .eq("nombre", name)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toBrand(data as BrandRow) : null;
}
