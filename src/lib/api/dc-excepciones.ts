import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toDcExcepcion, toDcSyncRetroactivo } from "./mappers";
import type {
  DcExcepcion,
  DcExcepcionRow,
  DcSyncRetroactivo,
  DcSyncRetroactivoRow,
  Page,
} from "./types";

export type DcExcepcionFilters = {
  page: number;
  pageSize: number;
  search?: string;
  estado?: "Activo" | "Inactivo";
  cuit?: string;
};

const DC_EXCEPCIONES_COLUMNS =
  "id, usuario, cuit, tipo, direccion, motivo, vigencia_desde, vigencia_hasta, autorizacion_codigo, estado, archivo_certificado, impuesto_id, fecha_creacion, fecha_actualizacion, impuestos(codigo, nombre)";

export async function listDcExcepciones(filters: DcExcepcionFilters): Promise<Page<DcExcepcion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, cuit } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("dc_excepciones").select(DC_EXCEPCIONES_COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`usuario.ilike.%${q}%,cuit.ilike.%${q}%,motivo.ilike.%${q}%`);
  }
  if (estado) query = query.eq("estado", estado);
  if (cuit) query = query.eq("cuit", cuit);

  query = query.order("fecha_creacion", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as DcExcepcionRow[];
  return {
    rows: rows.map(toDcExcepcion),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getDcExcepcion(id: string): Promise<DcExcepcion | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("dc_excepciones")
    .select(DC_EXCEPCIONES_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toDcExcepcion(data as DcExcepcionRow) : null;
}

export type DcExcepcionCreateInput = {
  email: string;
  cuit: string;
  tipo: "Alta manual" | "Convenio multilateral" | "Exención";
  direccion: "Entrantes" | "Salientes"; // NUNCA 'Ambos' - el frontend maneja la división
  motivo: string;
  vigencia_desde: string; // YYYY-MM-DD
  vigencia_hasta?: string | null;
  autorizacion_codigo?: string | null;
  estado?: "Activo" | "Inactivo";
  archivo_certificado?: string | null;
  impuesto_id?: string | null;
};

function normalizeCuit(cuit: string): string {
  return cuit.replace(/[^0-9]/g, "");
}

export async function createDcExcepcion(input: DcExcepcionCreateInput): Promise<DcExcepcion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("dc_excepciones")
    .insert({
      usuario: input.email.trim(),
      cuit: normalizeCuit(input.cuit),
      tipo: input.tipo,
      direccion: input.direccion,
      motivo: input.motivo.trim(),
      vigencia_desde: input.vigencia_desde,
      vigencia_hasta: input.vigencia_hasta ?? null,
      autorizacion_codigo: input.autorizacion_codigo?.trim() ?? null,
      estado: input.estado ?? "Activo",
      archivo_certificado: input.archivo_certificado ?? null,
      impuesto_id: input.impuesto_id ?? null,
    })
    .select(DC_EXCEPCIONES_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toDcExcepcion(data as DcExcepcionRow);
}

export type DcExcepcionUpdateInput = Partial<{
  tipo: "Alta manual" | "Convenio multilateral" | "Exención";
  direccion: "Entrantes" | "Salientes";
  motivo: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  autorizacion_codigo: string | null;
  estado: "Activo" | "Inactivo";
  archivo_certificado: string | null;
  impuesto_id: string | null;
}>;

export async function updateDcExcepcion(
  id: string,
  input: DcExcepcionUpdateInput,
): Promise<DcExcepcion> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.direccion !== undefined) payload.direccion = input.direccion;
  if (input.motivo !== undefined) payload.motivo = input.motivo.trim();
  if (input.vigencia_desde !== undefined) payload.vigencia_desde = input.vigencia_desde;
  if (input.vigencia_hasta !== undefined) payload.vigencia_hasta = input.vigencia_hasta ?? null;
  if (input.autorizacion_codigo !== undefined)
    payload.autorizacion_codigo = input.autorizacion_codigo?.trim() ?? null;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.archivo_certificado !== undefined) payload.archivo_certificado = input.archivo_certificado ?? null;
  if (input.impuesto_id !== undefined) payload.impuesto_id = input.impuesto_id ?? null;

  const { data, error } = await sb
    .from("dc_excepciones")
    .update(payload)
    .eq("id", id)
    .select(DC_EXCEPCIONES_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toDcExcepcion(data as DcExcepcionRow);
}

export async function setDcExcepcionEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<DcExcepcion> {
  return updateDcExcepcion(id, { estado });
}

export async function deleteDcExcepcion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("dc_excepciones").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// Tipo="Ambos" en el form → 2 INSERTs (Entrantes + Salientes). La tabla solo
// acepta esos dos valores por CHECK.
export async function createDcExcepcionAmbos(
  input: Omit<DcExcepcionCreateInput, "direccion">,
): Promise<DcExcepcion[]> {
  const sb = requireSupabase();
  const baseInput = {
    usuario: input.email.trim(),
    cuit: normalizeCuit(input.cuit),
    tipo: input.tipo,
    motivo: input.motivo.trim(),
    vigencia_desde: input.vigencia_desde,
    vigencia_hasta: input.vigencia_hasta ?? null,
    autorizacion_codigo: input.autorizacion_codigo?.trim() ?? null,
    estado: input.estado ?? ("Activo" as const),
    archivo_certificado: input.archivo_certificado ?? null,
    impuesto_id: input.impuesto_id ?? null,
  };

  const { data, error } = await sb
    .from("dc_excepciones")
    .insert([
      { ...baseInput, direccion: "Entrantes" },
      { ...baseInput, direccion: "Salientes" },
    ])
    .select(DC_EXCEPCIONES_COLUMNS);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as DcExcepcionRow[]).map(toDcExcepcion);
}

// ============================================================================
// DC_SYNC_RETROACTIVO
// ============================================================================

export type DcSyncRetroactivoFilters = {
  page: number;
  pageSize: number;
  cuit?: string;
};

const DC_SYNC_RETROACTIVO_COLUMNS = "id, cuit, desde, hasta, preview_json, aplicado, created_at";

export async function listDcSyncRetroactivos(
  filters: DcSyncRetroactivoFilters,
): Promise<Page<DcSyncRetroactivo>> {
  const sb = requireSupabase();
  const { page, pageSize, cuit } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb
    .from("dc_sync_retroactivo")
    .select(DC_SYNC_RETROACTIVO_COLUMNS, { count: "exact" });

  if (cuit) query = query.eq("cuit", cuit);

  query = query.order("fecha_creacion", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as DcSyncRetroactivoRow[];
  return {
    rows: rows.map(toDcSyncRetroactivo),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export type DcSyncRetroactivoCreateInput = {
  cuit: string;
  desde: string; // YYYY-MM-DD
  hasta?: string | null; // YYYY-MM-DD
  preview_json: Record<string, unknown>; // Requerido: el backend o caller debe calcularlo
};

export async function createDcSyncRetroactivo(
  input: DcSyncRetroactivoCreateInput,
): Promise<DcSyncRetroactivo> {
  const sb = requireSupabase();

  // TODO: cuando exista un RPC o edge function que calcule el preview real,
  // invocarlo acá en vez de recibirlo del caller.
  const previewJson = input.preview_json;

  const { data, error } = await sb
    .from("dc_sync_retroactivo")
    .insert({
      cuit: normalizeCuit(input.cuit),
      desde: input.desde,
      hasta: input.hasta ?? null,
      preview_json: previewJson,
      aplicado: false, // preview-first: NUNCA se crea ya aplicado
    })
    .select(DC_SYNC_RETROACTIVO_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toDcSyncRetroactivo(data as DcSyncRetroactivoRow);
}

export async function setDcSyncRetroactivoAplicado(
  id: string,
  aplicado: boolean,
): Promise<DcSyncRetroactivo> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("dc_sync_retroactivo")
    .update({ aplicado })
    .eq("id", id)
    .select(DC_SYNC_RETROACTIVO_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toDcSyncRetroactivo(data as DcSyncRetroactivoRow);
}

export async function deleteDcSyncRetroactivo(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("dc_sync_retroactivo").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}
