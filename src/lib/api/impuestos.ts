import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import {
  toImpuesto,
  toAlicuota,
  toImpuestoAsignacion,
  toIbPadron,
  toIbNormalizacionPreview,
} from "./mappers";
import type {
  Impuesto,
  ImpuestoRow,
  ImpuestoInput,
  Alicuota,
  AlicuotaRow,
  ImpuestoAsignacion,
  ImpuestoAsignacionRow,
  IbPadron,
  IbPadronRow,
  IbNormalizacionPreview,
  IbNormalizacionPreviewRow,
  TipoPersona,
  Page,
  Pagination,
  AlicuotaInput,
  ImpuestoAsignacionInput,
} from "./types";

export type ImpuestoFilters = Pagination & {
  search?: string;
  estado?: "Activo" | "Inactivo";
  tipo?: "Porcentaje" | "Fijo" | "Otro";
};

const IMPUESTOS_COLUMNS =
  "id, codigo, nombre, descripcion, tipo, monto, estado, created_at, updated_at, impuestos_alicuotas(id, impuesto_id, codigo, tasa, descripcion, estado, created_at)";

export async function listImpuestos(filters: ImpuestoFilters): Promise<Page<Impuesto>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, tipo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("impuestos").select(IMPUESTOS_COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (tipo) query = query.eq("tipo", tipo);

  query = query.order("codigo", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as (ImpuestoRow & {
    impuestos_alicuotas?: AlicuotaRow[] | null;
  })[];

  return {
    rows: rows.map(toImpuesto),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getImpuesto(id: string): Promise<Impuesto | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("impuestos")
    .select(IMPUESTOS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data
    ? toImpuesto(data as ImpuestoRow & { impuestos_alicuotas?: AlicuotaRow[] | null })
    : null;
}

export type ImpuestoCreateInput = ImpuestoInput;

export async function createImpuesto(input: ImpuestoCreateInput): Promise<Impuesto> {
  const sb = requireSupabase();
  const { data: impuesto, error: impuestoError } = await sb
    .from("impuestos")
    .insert({
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      tipo: input.tipo,
      monto: input.monto,
      estado: input.estado,
    })
    .select("id, codigo, nombre, descripcion, tipo, monto, estado, created_at, updated_at")
    .single();
  if (impuestoError) throw new DataAccessError(impuestoError);

  return getImpuesto(impuesto.id) as Promise<Impuesto>;
}

export type ImpuestoUpdateInput = Partial<ImpuestoInput>;

export async function updateImpuesto(id: string, input: ImpuestoUpdateInput): Promise<Impuesto> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo.trim();
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() ?? null;
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.monto !== undefined) payload.monto = input.monto;
  if (input.estado !== undefined) payload.estado = input.estado;

  const { data, error } = await sb
    .from("impuestos")
    .update(payload)
    .eq("id", id)
    .select("id, codigo, nombre, descripcion, tipo, monto, estado, created_at, updated_at")
    .single();
  if (error) throw new DataAccessError(error);

  return getImpuesto(data.id) as Promise<Impuesto>;
}

export async function setImpuestoEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<Impuesto> {
  return updateImpuesto(id, { estado });
}

export async function deleteImpuesto(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("impuestos").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// ALICUOTAS
// ============================================================================

export type AlicuotaFilters = Pagination & {
  impuesto_id?: string;
  search?: string;
  estado?: "Activo" | "Inactivo";
};

const ALICUOTAS_COLUMNS = "id, impuesto_id, codigo, tasa, descripcion, estado, created_at";

export async function listAlicuotas(filters: AlicuotaFilters): Promise<Page<Alicuota>> {
  const sb = requireSupabase();
  const { page, pageSize, impuesto_id, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("impuestos_alicuotas").select(ALICUOTAS_COLUMNS, { count: "exact" });

  if (impuesto_id) query = query.eq("impuesto_id", impuesto_id);
  if (estado) query = query.eq("estado", estado);
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`);
  }

  query = query.order("codigo", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as AlicuotaRow[];
  return {
    rows: rows.map(toAlicuota),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createAlicuota(impuesto_id: string, input: AlicuotaInput): Promise<Alicuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("impuestos_alicuotas")
    .insert({
      impuesto_id,
      codigo: input.codigo.trim(),
      tasa: input.tasa,
      descripcion: input.descripcion?.trim() ?? null,
      estado: input.estado ?? "Activo",
    })
    .select("id, impuesto_id, codigo, tasa, descripcion, estado, created_at")
    .single();
  if (error) throw new DataAccessError(error);
  return toAlicuota(data as AlicuotaRow);
}

export async function updateAlicuota(id: string, input: Partial<AlicuotaInput>): Promise<Alicuota> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo.trim();
  if (input.tasa !== undefined) payload.tasa = input.tasa;
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion?.trim() ?? null;
  if (input.estado !== undefined) payload.estado = input.estado;

  const { data, error } = await sb
    .from("impuestos_alicuotas")
    .update(payload)
    .eq("id", id)
    .select("id, impuesto_id, codigo, tasa, descripcion, estado, created_at")
    .single();
  if (error) throw new DataAccessError(error);
  return toAlicuota(data as AlicuotaRow);
}

export async function setAlicuotaEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<Alicuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("impuestos_alicuotas")
    .update({ estado })
    .eq("id", id)
    .select("id, impuesto_id, codigo, tasa, descripcion, estado, created_at")
    .single();
  if (error) throw new DataAccessError(error);
  return toAlicuota(data as AlicuotaRow);
}

export async function deleteAlicuota(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("impuestos_alicuotas").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// ASIGNACIONES
// ============================================================================

export type ImpuestoAsignacionFilters = Pagination & {
  search?: string;
  estado?: "Activo" | "Inactivo";
  impuesto_id?: string;
  cliente_legajo?: string;
};

const ASIGNACIONES_COLUMNS =
  "id, legajo, impuesto_id, tipo, monto, estado, fecha_asignacion, impuestos(codigo, nombre, tipo, monto), clientes!impuestos_asignaciones_legajo_fkey(legajo, nombre, cuit, tipo_persona, correo)";

type AsignacionRowConEmbed = ImpuestoAsignacionRow & {
  impuestos?:
    | {
        codigo: string;
        nombre: string;
        tipo: "Porcentaje" | "Fijo" | "Otro";
        monto: number | null;
      }[]
    | null;
  clientes?:
    | { legajo: string; nombre: string; cuit: string; tipo_persona: TipoPersona; correo: string }[]
    | null;
};

export async function listImpuestosAsignaciones(
  filters: ImpuestoAsignacionFilters,
): Promise<Page<ImpuestoAsignacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, impuesto_id, cliente_legajo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("impuestos_asignaciones").select(ASIGNACIONES_COLUMNS, { count: "exact" });

  if (impuesto_id) query = query.eq("impuesto_id", impuesto_id);
  if (cliente_legajo) query = query.eq("legajo", cliente_legajo);
  if (estado) query = query.eq("estado", estado);
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `impuestos.codigo.ilike.%${q}%,impuestos.nombre.ilike.%${q}%,legajo.ilike.%${q}%`,
    );
  }

  query = query.order("fecha_asignacion", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as AsignacionRowConEmbed[];

  return {
    rows: rows.map(toImpuestoAsignacion),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createImpuestoAsignacion(
  input: ImpuestoAsignacionInput,
): Promise<ImpuestoAsignacion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("impuestos_asignaciones")
    .insert({
      legajo: input.cliente_legajo.trim(),
      impuesto_id: input.impuesto_id,
      tipo: input.tipo,
      monto: input.monto,
      estado: input.estado ?? "Activo",
      fecha_asignacion: input.fecha_asignacion ?? new Date().toISOString().slice(0, 10),
    })
    .select(
      "id, legajo, impuesto_id, tipo, monto, estado, fecha_asignacion, impuestos(codigo, nombre, tipo, monto), clientes!impuestos_asignaciones_legajo_fkey(legajo, nombre, cuit, tipo_persona, correo)",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toImpuestoAsignacion(data as AsignacionRowConEmbed);
}

export async function updateImpuestoAsignacion(
  id: string,
  input: Partial<ImpuestoAsignacionInput>,
): Promise<ImpuestoAsignacion> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.monto !== undefined) payload.monto = input.monto;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.fecha_asignacion !== undefined) payload.fecha_asignacion = input.fecha_asignacion;

  const { data, error } = await sb
    .from("impuestos_asignaciones")
    .update(payload)
    .eq("id", id)
    .select(
      "id, legajo, impuesto_id, tipo, monto, estado, fecha_asignacion, impuestos(codigo, nombre, tipo, monto), clientes!impuestos_asignaciones_legajo_fkey(legajo, nombre, cuit, tipo_persona, correo)",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toImpuestoAsignacion(data as AsignacionRowConEmbed);
}

export async function setImpuestoAsignacionEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<ImpuestoAsignacion> {
  return updateImpuestoAsignacion(id, { estado });
}

export async function deleteImpuestoAsignacion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("impuestos_asignaciones").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function listImpuestosForAsignacion(): Promise<
  { id: string; codigo: string; nombre: string; tipo: string; monto: number | null }[]
> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("impuestos")
    .select("id, codigo, nombre, tipo, monto")
    .eq("estado", "Activo")
    .order("codigo", { ascending: true });
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    tipo: r.tipo,
    monto: r.monto,
  }));
}

// ============================================================================
// IB_PADRONES
// ============================================================================

export type IbPadronFilters = Pagination & {
  search?: string;
  estado?: "Cargando" | "Procesando" | "Finalizado" | "Error";
  impuesto_id?: string;
};

const PADRONES_COLUMNS = "id, impuesto_id, nombre, archivo, estado, progreso, created_at";

export async function listIbPadrones(filters: IbPadronFilters): Promise<Page<IbPadron>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, impuesto_id } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("ib_padrones").select(PADRONES_COLUMNS, { count: "exact" });

  if (impuesto_id) query = query.eq("impuesto_id", impuesto_id);
  if (estado) query = query.eq("estado", estado);
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`nombre.ilike.%${q}%,archivo.ilike.%${q}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as IbPadronRow[];
  return {
    rows: rows.map(toIbPadron),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createIbPadron(input: {
  impuesto_id: string;
  nombre: string;
  archivo: string;
}): Promise<IbPadron> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("ib_padrones")
    .insert({
      impuesto_id: input.impuesto_id,
      nombre: input.nombre.trim(),
      archivo: input.archivo.trim(),
      estado: "Cargando",
    })
    .select("id, impuesto_id, nombre, archivo, estado, progreso, created_at")
    .single();
  if (error) throw new DataAccessError(error);
  return toIbPadron(data as IbPadronRow);
}

export async function updateIbPadron(
  id: string,
  input: Partial<{ estado: string; progreso: number }>,
): Promise<IbPadron> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.progreso !== undefined) payload.progreso = input.progreso;

  const { data, error } = await sb
    .from("ib_padrones")
    .update(payload)
    .eq("id", id)
    .select("id, impuesto_id, nombre, archivo, estado, progreso, created_at")
    .single();
  if (error) throw new DataAccessError(error);
  return toIbPadron(data as IbPadronRow);
}

export async function deleteIbPadron(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("ib_padrones").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// IB_NORMALIZACION_PREVIEW
// ============================================================================

export type IbNormalizacionPreviewFilters = Pagination & {
  padron_id?: string;
};

const NORMALIZACION_PREVIEW_COLUMNS =
  "id, padron_id, kpis_json, creados_json, desactivados_json, omitidos_json, aplicado, created_at";

export async function listIbNormalizacionPreviews(
  filters: IbNormalizacionPreviewFilters,
): Promise<Page<IbNormalizacionPreview>> {
  const sb = requireSupabase();
  const { page, pageSize, padron_id } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb
    .from("ib_normalizacion_preview")
    .select(NORMALIZACION_PREVIEW_COLUMNS, { count: "exact" });

  if (padron_id) query = query.eq("padron_id", padron_id);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as IbNormalizacionPreviewRow[];
  return {
    rows: rows.map(toIbNormalizacionPreview),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createIbNormalizacionPreview(input: {
  padron_id: string;
  kpis_json: object;
  creados_json: object;
  desactivados_json: object;
  omitidos_json: object;
}): Promise<IbNormalizacionPreview> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("ib_normalizacion_preview")
    .insert({
      padron_id: input.padron_id,
      kpis_json: input.kpis_json,
      creados_json: input.creados_json,
      desactivados_json: input.desactivados_json,
      omitidos_json: input.omitidos_json,
    })
    .select(
      "id, padron_id, kpis_json, creados_json, desactivados_json, omitidos_json, aplicado, created_at",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toIbNormalizacionPreview(data as IbNormalizacionPreviewRow);
}

export async function setNormalizacionAplicado(
  id: string,
  aplicado: boolean,
): Promise<IbNormalizacionPreview> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("ib_normalizacion_preview")
    .update({ aplicado })
    .eq("id", id)
    .select(
      "id, padron_id, kpis_json, creados_json, desactivados_json, omitidos_json, aplicado, created_at",
    )
    .single();
  if (error) throw new DataAccessError(error);
  return toIbNormalizacionPreview(data as IbNormalizacionPreviewRow);
}

export async function deleteIbNormalizacionPreview(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("ib_normalizacion_preview").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

export async function getLatestNormalizacionPreviewByPadron(
  padron_id: string,
): Promise<IbNormalizacionPreview | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("ib_normalizacion_preview")
    .select(
      "id, padron_id, kpis_json, creados_json, desactivados_json, omitidos_json, aplicado, created_at",
    )
    .eq("padron_id", padron_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toIbNormalizacionPreview(data as IbNormalizacionPreviewRow) : null;
}
