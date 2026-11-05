import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toTax,toRate,toTaxAssignment } from "@/infrastructure/supabase/legacy/mappers";
import type {
Tax,
TaxInput,
Rate,
RateInput,
TaxRow,
TaxRateRow,
SourceRate,
AddressRate,
KindCalculoRate,
TaxAssignment,
TaxAssignmentFilters,
TaxAssignmentRow,
OperationTax,
RatePrevista,
Page,
Pagination,
TaxAssignmentInput,
} from "@/infrastructure/supabase/legacy/types";

// ============================================================================
// IMPUESTOS (tabla taxes)
// ============================================================================

export type TaxFilters = Pagination & {
  search?: string;
  estado?: "Activo" | "Inactivo";
};

const SOURCE_A_DB: Record<SourceRate, TaxRow["rate_source"]> = {
  Fija: "fixed",
  Padrón: "taxpayer_registry",
  Manual: "manual",
};
const ADDRESS_A_DB: Record<AddressRate, TaxRateRow["direction"]> = {
  Entrante: "inbound",
  Saliente: "outbound",
  Ambas: "both",
};
const CALCULO_A_DB: Record<KindCalculoRate, TaxRateRow["calculation_type"]> = {
  Porcentaje: "percentage",
  "Monto fijo": "fixed_amount",
};
const statusADb = (e: "Activo" | "Inactivo") => (e === "Activo" ? "active" : "inactive");

const TAX_COLUMNS =
  "id, code, name, description, scope, status, rate_source, created_at, updated_at";
const TAX_RATE_COLUMNS =
  "id, tax_id, code, calculation_type, value, direction, description, status, valid_from, valid_to, created_at, updated_at";
const TAXES_COLUMNS = `${TAX_COLUMNS}, tax_rates(${TAX_RATE_COLUMNS})`;

type TaxWithRates = TaxRow & { tax_rates?: TaxRateRow[] | null };

export async function listTaxes(filters: TaxFilters): Promise<Page<Tax>> {
  const sb = requireSupabase();
  const { page, pageSize, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("taxes").select(TAXES_COLUMNS, { count: "exact" });

  if (search && search.trim()) {
    const q = search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (status) query = query.eq("status", statusADb(status));

  query = query.order("code", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as TaxWithRates[];
  return {
    rows: rows.map(toTax),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getTax(id: string): Promise<Tax | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("taxes").select(TAXES_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  return data ? toTax(data as TaxWithRates) : null;
}

function rateADb(input: Partial<RateInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.codigo !== undefined) out.code = input.codigo.trim().toUpperCase();
  if (input.tipoCalculo !== undefined) out.calculation_type = CALCULO_A_DB[input.tipoCalculo];
  if (input.valor !== undefined) out.value = input.valor;
  if (input.direccion !== undefined) out.direction = ADDRESS_A_DB[input.direccion];
  if (input.descripcion !== undefined) out.description = input.descripcion?.trim() || null;
  if (input.estado !== undefined) out.status = statusADb(input.estado);
  if (input.vigenciaDesde !== undefined) out.valid_from = input.vigenciaDesde;
  if (input.vigenciaHasta !== undefined) out.valid_to = input.vigenciaHasta || null;
  return out;
}

/** Alta del impuesto con sus alicuotas en una sola transaccion (RPC tax_create). */
export async function createTax(input: TaxInput, rates: RateInput[] = []): Promise<Tax> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_create", {
    p_tax: {
      code: input.codigo.trim().toUpperCase(),
      name: input.nombre.trim(),
      description: input.descripcion?.trim() || null,
      scope: input.ambito === "Interno" ? "internal" : "external",
      status: statusADb(input.estado),
      rate_source: SOURCE_A_DB[input.fuenteAlicuota],
    },
    p_rates: input.fuenteAlicuota === "Fija" ? rates.map(rateADb) : [],
  });
  if (error) throw toAppError(error);
  return getTax(data as string) as Promise<Tax>;
}

export type TaxUpdateInput = Partial<TaxInput>;

export async function updateTax(id: string, input: TaxUpdateInput): Promise<Tax> {
  const sb = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.codigo !== undefined) payload.code = input.codigo.trim().toUpperCase();
  if (input.nombre !== undefined) payload.name = input.nombre.trim();
  if (input.descripcion !== undefined) payload.description = input.descripcion?.trim() || null;
  if (input.estado !== undefined) payload.status = statusADb(input.estado);
  if (input.ambito !== undefined)
    payload.scope = input.ambito === "Interno" ? "internal" : "external";
  if (input.fuenteAlicuota !== undefined) payload.rate_source = SOURCE_A_DB[input.fuenteAlicuota];

  const { error } = await sb.from("taxes").update(payload).eq("id", id);
  if (error) throw toAppError(error);
  return getTax(id) as Promise<Tax>;
}

export async function setTaxStatus(id: string, status: "Activo" | "Inactivo"): Promise<Tax> {
  return updateTax(id, { estado: status });
}

export async function deleteTax(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("taxes").delete().eq("id", id);
  if (error) throw toAppError(error);
}

// ============================================================================
// ALICUOTAS (tabla tax_rates)
// ============================================================================

export type RateFilters = Pagination & {
  impuesto_id?: string;
  search?: string;
  estado?: "Activo" | "Inactivo";
};

export async function listRates(filters: RateFilters): Promise<Page<Rate>> {
  const sb = requireSupabase();
  const { page, pageSize, impuesto_id: tax_id, search, estado: status } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("tax_rates").select(TAX_RATE_COLUMNS, { count: "exact" });

  if (tax_id) query = query.eq("tax_id", tax_id);
  if (status) query = query.eq("status", statusADb(status));
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
  if (error) throw toAppError(error);

  const rows = (data ?? []) as TaxRateRow[];
  return {
    rows: rows.map(toRate),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createRate(taxId: string, input: RateInput): Promise<Rate> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_rates")
    .insert({ tax_id: taxId, ...rateADb(input) })
    .select(TAX_RATE_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toRate(data as TaxRateRow);
}

export async function updateRate(id: string, input: Partial<RateInput>): Promise<Rate> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_rates")
    .update(rateADb(input))
    .eq("id", id)
    .select(TAX_RATE_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toRate(data as TaxRateRow);
}

export async function setRateStatus(id: string, status: "Activo" | "Inactivo"): Promise<Rate> {
  return updateRate(id, { estado: status });
}

export async function deleteRate(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("tax_rates").delete().eq("id", id);
  if (error) throw toAppError(error);
}

// ============================================================================
// ASIGNACIONES (tabla tax_assignments)
// ============================================================================

export type { TaxAssignmentFilters as ImpuestoAsignacionFilters } from "@/infrastructure/supabase/legacy/types";

const OPERATION_A_DB: Record<OperationTax, NonNullable<TaxAssignmentRow["operation_type"]>> = {
  Depósito: "deposit",
  Retiro: "withdrawal",
  "Link de pago": "payment_link",
  "E-commerce": "ecommerce",
};

const ASSIGNMENTS_COLUMNS =
  "id, client_legajo, tax_id, operation_type, status, custom_calculation_type, custom_rate, assigned_at, updated_at, " +
  `taxes(code, name, rate_source, tax_rates(${TAX_RATE_COLUMNS})), ` +
  "clientes!tax_assignments_client_legajo_fkey(legajo, nombre, cuit, tipo_persona, correo)";

function assignmentADb(input: Partial<TaxAssignmentInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.cliente_legajo !== undefined) out.client_legajo = input.cliente_legajo.trim();
  if (input.impuesto_id !== undefined) out.tax_id = input.impuesto_id;
  if (input.operacion !== undefined)
    out.operation_type = input.operacion ? OPERATION_A_DB[input.operacion] : null;
  if (input.estado !== undefined) out.status = statusADb(input.estado);
  // La base exige el par completo (o vacio) y solo en impuestos manuales.
  if (input.tipo_calculo !== undefined || input.alicuota_propia !== undefined) {
    const withRate = input.tipo_calculo != null && input.alicuota_propia != null;
    out.custom_calculation_type = withRate ? CALCULO_A_DB[input.tipo_calculo!] : null;
    out.custom_rate = withRate ? input.alicuota_propia : null;
  }
  return out;
}

export async function listTaxesAssignments(
  filters: TaxAssignmentFilters,
): Promise<Page<TaxAssignment>> {
  const sb = requireSupabase();
  const {
    page,
    pageSize,
    search,
    estado: status,
    impuesto_id: tax_id,
    cliente_legajo: customer_legajo,
  } = filters;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = sb.from("tax_assignments").select(ASSIGNMENTS_COLUMNS, { count: "exact" });

  if (tax_id) query = query.eq("tax_id", tax_id);
  if (customer_legajo) query = query.eq("client_legajo", customer_legajo);
  if (status) query = query.eq("status", statusADb(status));
  if (search && search.trim()) {
    // PostgREST no combina en un OR columnas propias y embebidas: primero los
    // impuestos que coinciden, despues legajo o impuesto.
    // Comas y parentesis romperian el filtro or=(...); % y _ son comodines de ilike.
    const q = search.trim().replace(/[,()]/g, " ").replace(/[%_]/g, "\\$&");
    const { data: taxes, error: taxErr } = await sb
      .from("taxes")
      .select("id")
      .or(`code.ilike.%${q}%,name.ilike.%${q}%`);
    if (taxErr) throw toAppError(taxErr);
    const ids = (taxes ?? []).map((t) => t.id as string);
    query = query.or(
      ids.length > 0
        ? `client_legajo.ilike.%${q}%,tax_id.in.(${ids.join(",")})`
        : `client_legajo.ilike.%${q}%`,
    );
  }

  query = query.order("assigned_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw toAppError(error);

  const rows = (data ?? []) as unknown as TaxAssignmentRow[];
  return {
    rows: rows.map(toTaxAssignment),
    total: count ?? rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function createTaxAssignment(input: TaxAssignmentInput): Promise<TaxAssignment> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_assignments")
    .insert(assignmentADb(input))
    .select(ASSIGNMENTS_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toTaxAssignment(data as unknown as TaxAssignmentRow);
}

/** El comercio no se cambia: para otro comercio se crea otra asignacion. */
export async function updateTaxAssignment(
  id: string,
  input: Partial<Omit<TaxAssignmentInput, "cliente_legajo">>,
): Promise<TaxAssignment> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tax_assignments")
    .update(assignmentADb(input))
    .eq("id", id)
    .select(ASSIGNMENTS_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return toTaxAssignment(data as unknown as TaxAssignmentRow);
}

export async function setTaxAssignmentStatus(
  id: string,
  status: "Activo" | "Inactivo",
): Promise<TaxAssignment> {
  return updateTaxAssignment(id, { estado: status });
}

export async function deleteTaxAssignment(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from("tax_assignments").delete().eq("id", id);
  if (error) throw toAppError(error);
}

/** Alicuota que regiria hoy el impuesto para el comercio, por direccion (RPC tax_rate_preview). */
export async function previewRateAssignment(
  customerLegajo: string,
  taxId: string,
): Promise<RatePrevista[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("tax_rate_preview", {
    p_legajo: customerLegajo.trim(),
    p_tax_id: taxId,
  });
  if (error) throw toAppError(error);
  type Row = {
    direction: "inbound" | "outbound";
    rate_code: string | null;
    calculation_type: TaxRateRow["calculation_type"];
    rate: number | string;
    registry_id: string | null;
    note: string | null;
  };
  return ((data ?? []) as Row[]).map((f) => ({
    direccion: f.direction === "inbound" ? "Entrante" : "Saliente",
    codigo: f.rate_code,
    tipoCalculo: f.calculation_type === "fixed_amount" ? "Monto fijo" : "Porcentaje",
    valor: Number(f.rate),
    padronId: f.registry_id,
    nota: f.note,
  }));
}

/** Impuestos activos (con sus alicuotas) para elegir en asignaciones, padrones y exenciones. */
export async function listTaxesForAssignment(): Promise<Tax[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("taxes")
    .select(TAXES_COLUMNS)
    .eq("status", "active")
    .order("code", { ascending: true });
  if (error) throw toAppError(error);
  return ((data ?? []) as TaxWithRates[]).map(toTax);
}
