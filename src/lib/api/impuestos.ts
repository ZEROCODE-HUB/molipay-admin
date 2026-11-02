import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import { toImpuesto, toAlicuota, toImpuestoAsignacion } from "./mappers";
import type {
  Impuesto,
  ImpuestoInput,
  Alicuota,
  AlicuotaInput,
  TaxRow,
  TaxRateRow,
  FuenteAlicuota,
  DireccionAlicuota,
  TipoCalculoAlicuota,
  ImpuestoAsignacion,
  ImpuestoAsignacionFilters,
  TaxAssignmentRow,
  OperacionImpuesto,
  AlicuotaPrevista,
  Page,
  Pagination,
  ImpuestoAsignacionInput,
} from "./types";

// ============================================================================
// IMPUESTOS (tabla taxes)
// ============================================================================

export type ImpuestoFilters = Pagination & {
  search?: string;
  estado?: "Activo" | "Inactivo";
};

const FUENTE_A_DB: Record<FuenteAlicuota, TaxRow["rate_source"]> = {
  Fija: "fixed",
  Padrón: "taxpayer_registry",
  Manual: "manual",
};
const DIRECCION_A_DB: Record<DireccionAlicuota, TaxRateRow["direction"]> = {
  Entrante: "inbound",
  Saliente: "outbound",
  Ambas: "both",
};
const CALCULO_A_DB: Record<TipoCalculoAlicuota, TaxRateRow["calculation_type"]> = {
  Porcentaje: "percentage",
  "Monto fijo": "fixed_amount",
};
const estadoADb = (e: "Activo" | "Inactivo") => (e === "Activo" ? "active" : "inactive");

const TAX_COLUMNS =
  "id, code, name, description, scope, status, rate_source, created_at, updated_at";
const TAX_RATE_COLUMNS =
  "id, tax_id, code, calculation_type, value, direction, description, status, valid_from, valid_to, created_at, updated_at";
const IMPUESTOS_COLUMNS = `${TAX_COLUMNS}, tax_rates(${TAX_RATE_COLUMNS})`;

type TaxConAlicuotas = TaxRow & { tax_rates?: TaxRateRow[] | null };

export async function listImpuestos(filters: ImpuestoFilters): Promise<Page<Impuesto>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("taxes").select(IMPUESTOS_COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (estado) query = query.eq("status", estadoADb(estado));

  query = query.order("code", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as TaxConAlicuotas[];
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
    .from("taxes")
    .select(IMPUESTOS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toImpuesto(data as TaxConAlicuotas) : null;
}

function alicuotaADb(input: Partial<AlicuotaInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.codigo !== undefined) out.code = input.codigo.trim().toUpperCase();
  if (input.tipoCalculo !== undefined) out.calculation_type = CALCULO_A_DB[input.tipoCalculo];
  if (input.valor !== undefined) out.value = input.valor;
  if (input.direccion !== undefined) out.direction = DIRECCION_A_DB[input.direccion];
  if (input.descripcion !== undefined) out.description = input.descripcion?.trim() || null;
  if (input.estado !== undefined) out.status = estadoADb(input.estado);
  if (input.vigenciaDesde !== undefined) out.valid_from = input.vigenciaDesde;
  if (input.vigenciaHasta !== undefined) out.valid_to = input.vigenciaHasta || null;
  return out;
}

/** Alta del impuesto con sus alicuotas en una sola transaccion (RPC tax_create). */
export async function createImpuesto(
  input: ImpuestoInput,
  alicuotas: AlicuotaInput[] = [],
): Promise<Impuesto> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_create", {
    p_tax: {
      code: input.codigo.trim().toUpperCase(),
      name: input.nombre.trim(),
      description: input.descripcion?.trim() || null,
      scope: input.ambito === "Interno" ? "internal" : "external",
      status: estadoADb(input.estado),
      rate_source: FUENTE_A_DB[input.fuenteAlicuota],
    },
    p_rates: input.fuenteAlicuota === "Fija" ? alicuotas.map(alicuotaADb) : [],
  });
  if (error) throw new DataAccessError(error);
  return getImpuesto(data as string) as Promise<Impuesto>;
}

export type ImpuestoUpdateInput = Partial<ImpuestoInput>;

export async function updateImpuesto(id: string, input: ImpuestoUpdateInput): Promise<Impuesto> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.code = input.codigo.trim().toUpperCase();
  if (input.nombre !== undefined) payload.name = input.nombre.trim();
  if (input.descripcion !== undefined) payload.description = input.descripcion?.trim() || null;
  if (input.estado !== undefined) payload.status = estadoADb(input.estado);
  if (input.ambito !== undefined)
    payload.scope = input.ambito === "Interno" ? "internal" : "external";
  if (input.fuenteAlicuota !== undefined) payload.rate_source = FUENTE_A_DB[input.fuenteAlicuota];

  const { error } = await sb.from("taxes").update(payload).eq("id", id);
  if (error) throw new DataAccessError(error);
  return getImpuesto(id) as Promise<Impuesto>;
}

export async function setImpuestoEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<Impuesto> {
  return updateImpuesto(id, { estado });
}

export async function deleteImpuesto(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("taxes").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// ALICUOTAS (tabla tax_rates)
// ============================================================================

export type AlicuotaFilters = Pagination & {
  impuesto_id?: string;
  search?: string;
  estado?: "Activo" | "Inactivo";
};

export async function listAlicuotas(filters: AlicuotaFilters): Promise<Page<Alicuota>> {
  const sb = requireSupabase();
  const { page, pageSize, impuesto_id, search, estado } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("tax_rates").select(TAX_RATE_COLUMNS, { count: "exact" });

  if (impuesto_id) query = query.eq("tax_id", impuesto_id);
  if (estado) query = query.eq("status", estadoADb(estado));
  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
  }

  query = query
    .order("status", { ascending: true })
    .order("valid_from", { ascending: false })
    .order("code", { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as TaxRateRow[];
  return {
    rows: rows.map(toAlicuota),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createAlicuota(impuestoId: string, input: AlicuotaInput): Promise<Alicuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_rates")
    .insert({ tax_id: impuestoId, ...alicuotaADb(input) })
    .select(TAX_RATE_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toAlicuota(data as TaxRateRow);
}

export async function updateAlicuota(id: string, input: Partial<AlicuotaInput>): Promise<Alicuota> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_rates")
    .update(alicuotaADb(input))
    .eq("id", id)
    .select(TAX_RATE_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toAlicuota(data as TaxRateRow);
}

export async function setAlicuotaEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<Alicuota> {
  return updateAlicuota(id, { estado });
}

export async function deleteAlicuota(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("tax_rates").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

// ============================================================================
// ASIGNACIONES (tabla tax_assignments)
// ============================================================================

export type { ImpuestoAsignacionFilters } from "./types";

const OPERACION_A_DB: Record<OperacionImpuesto, NonNullable<TaxAssignmentRow["operation_type"]>> = {
  Depósito: "deposit",
  Retiro: "withdrawal",
  "Link de pago": "payment_link",
  "E-commerce": "ecommerce",
};

const ASIGNACIONES_COLUMNS =
  "id, client_legajo, tax_id, operation_type, status, custom_calculation_type, custom_rate, assigned_at, updated_at, " +
  `taxes(code, name, rate_source, tax_rates(${TAX_RATE_COLUMNS})), ` +
  "clientes!tax_assignments_client_legajo_fkey(legajo, nombre, cuit, tipo_persona, correo)";

function asignacionADb(input: Partial<ImpuestoAsignacionInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.cliente_legajo !== undefined) out.client_legajo = input.cliente_legajo.trim();
  if (input.impuesto_id !== undefined) out.tax_id = input.impuesto_id;
  if (input.operacion !== undefined)
    out.operation_type = input.operacion ? OPERACION_A_DB[input.operacion] : null;
  if (input.estado !== undefined) out.status = estadoADb(input.estado);
  // La base exige el par completo (o vacio) y solo en impuestos manuales.
  if (input.tipo_calculo !== undefined || input.alicuota_propia !== undefined) {
    const conAlicuota = input.tipo_calculo != null && input.alicuota_propia != null;
    out.custom_calculation_type = conAlicuota ? CALCULO_A_DB[input.tipo_calculo!] : null;
    out.custom_rate = conAlicuota ? input.alicuota_propia : null;
  }
  return out;
}

export async function listImpuestosAsignaciones(
  filters: ImpuestoAsignacionFilters,
): Promise<Page<ImpuestoAsignacion>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado, impuesto_id, cliente_legajo } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("tax_assignments").select(ASIGNACIONES_COLUMNS, { count: "exact" });

  if (impuesto_id) query = query.eq("tax_id", impuesto_id);
  if (cliente_legajo) query = query.eq("client_legajo", cliente_legajo);
  if (estado) query = query.eq("status", estadoADb(estado));
  if (search && search.trim()) {
    // PostgREST no combina en un OR columnas propias y embebidas: primero los
    // impuestos que coinciden, despues legajo o impuesto.
    // Comas y parentesis romperian el filtro or=(...); % y _ son comodines de ilike.
    const q = search.trim().replace(/[,()]/g, " ").replace(/[%_]/g, "\\$&");
    const { data: taxes, error: taxErr } = await sb
      .from("taxes")
      .select("id")
      .or(`code.ilike.%${q}%,name.ilike.%${q}%`);
    if (taxErr) throw new DataAccessError(taxErr);
    const ids = (taxes ?? []).map((t) => t.id as string);
    query = query.or(
      ids.length > 0
        ? `client_legajo.ilike.%${q}%,tax_id.in.(${ids.join(",")})`
        : `client_legajo.ilike.%${q}%`,
    );
  }

  query = query.order("assigned_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new DataAccessError(error);

  const rows = (data ?? []) as unknown as TaxAssignmentRow[];
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
    .from("tax_assignments")
    .insert(asignacionADb(input))
    .select(ASIGNACIONES_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toImpuestoAsignacion(data as unknown as TaxAssignmentRow);
}

/** El comercio no se cambia: para otro comercio se crea otra asignacion. */
export async function updateImpuestoAsignacion(
  id: string,
  input: Partial<Omit<ImpuestoAsignacionInput, "cliente_legajo">>,
): Promise<ImpuestoAsignacion> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_assignments")
    .update(asignacionADb(input))
    .eq("id", id)
    .select(ASIGNACIONES_COLUMNS)
    .single();
  if (error) throw new DataAccessError(error);
  return toImpuestoAsignacion(data as unknown as TaxAssignmentRow);
}

export async function setImpuestoAsignacionEstado(
  id: string,
  estado: "Activo" | "Inactivo",
): Promise<ImpuestoAsignacion> {
  return updateImpuestoAsignacion(id, { estado });
}

export async function deleteImpuestoAsignacion(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("tax_assignments").delete().eq("id", id);
  if (error) throw new DataAccessError(error);
}

/** Alicuota que regiria hoy el impuesto para el comercio, por direccion (RPC tax_rate_preview). */
export async function previewAlicuotaAsignacion(
  clienteLegajo: string,
  impuestoId: string,
): Promise<AlicuotaPrevista[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_rate_preview", {
    p_legajo: clienteLegajo.trim(),
    p_tax_id: impuestoId,
  });
  if (error) throw new DataAccessError(error);
  type Fila = {
    direction: "inbound" | "outbound";
    rate_code: string | null;
    calculation_type: TaxRateRow["calculation_type"];
    rate: number | string;
    registry_id: string | null;
    note: string | null;
  };
  return ((data ?? []) as Fila[]).map((f) => ({
    direccion: f.direction === "inbound" ? "Entrante" : "Saliente",
    codigo: f.rate_code,
    tipoCalculo: f.calculation_type === "fixed_amount" ? "Monto fijo" : "Porcentaje",
    valor: Number(f.rate),
    padronId: f.registry_id,
    nota: f.note,
  }));
}

/** Impuestos activos (con sus alicuotas) para elegir en asignaciones, padrones y exenciones. */
export async function listImpuestosForAsignacion(): Promise<Impuesto[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxes")
    .select(IMPUESTOS_COLUMNS)
    .eq("status", "active")
    .order("code", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as TaxConAlicuotas[]).map(toImpuesto);
}
