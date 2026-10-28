import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

// Configuracion de reglas de monitoreo (tabla public.alert_rules).
// El motor (evaluar_reglas_operacion) las lee en cada retiro y deposito.

export type AlertRuleCode =
  | "deposit_company_max"
  | "deposit_min_wages"
  | "deposit_monthly_limit"
  | "withdrawal_failed_attempts"
  | "repeated_transfers"
  | "transfers_per_hour"
  | "company_account_affinity"
  | "abnormal_volume"
  | "minors_transfer_policy"
  | "unusual_hours"
  | "deposit_min_wages_block"
  | "plaft_screening"
  | "transaction_profile_excess"
  | "monthly_volume_variation"
  | "high_risk_jurisdiction"
  | "single_operation_amount";

/** Campos de la ficha que pueden limitar una regla. Lista vacía o ausente = todos los clientes. */
export type RuleConditionKey = "tipo_persona" | "estado" | "actividad" | "provincia" | "riesgo" | "es_pep";
export type RuleConditions = Partial<Record<RuleConditionKey, string[]>>;
export type ActivityAmount = { activity: string; amount: number };

export type ScheduleDay = { day: number; enabled: boolean; start: string; end: string };
export type MinorsPolicy = "allow" | "alert" | "block";

export type AlertRule = {
  id: string;
  code: AlertRuleCode;
  name: string;
  category: string;
  description: string | null;
  action: "alert" | "block";
  parameters: Record<string, unknown>;
  conditions: RuleConditions;
  isEnabled: boolean;
  sortOrder: number;
  updatedAt: string;
};

type AlertRuleRow = {
  id: string;
  code: AlertRuleCode;
  name: string;
  category: string;
  description: string | null;
  action: "alert" | "block";
  parameters: Record<string, unknown>;
  conditions: RuleConditions | null;
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
};

export async function listAlertRules(): Promise<AlertRule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("alert_rules")
    .select("id, code, name, category, description, action, parameters, conditions, is_enabled, sort_order, updated_at")
    .order("sort_order", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as AlertRuleRow[]).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    description: r.description,
    action: r.action,
    parameters: r.parameters ?? {},
    conditions: r.conditions ?? {},
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  }));
}

/** Guarda varias reglas en una sola transaccion (la base valida cada una). */
export async function saveAlertRules(
  rules: { code: AlertRuleCode; isEnabled: boolean; parameters: Record<string, unknown>; conditions?: RuleConditions }[],
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("guardar_alert_rules", {
    p_rules: rules.map((r) => ({
      code: r.code,
      is_enabled: r.isEnabled,
      parameters: r.parameters,
      ...(r.conditions ? { conditions: r.conditions } : {}),
    })),
  });
  if (error) throw new DataAccessError(error);
}

// ---------------------------------------------------------------------------
// Parametros de bloqueo individuales por cliente (public.client_block_parameters)
// ---------------------------------------------------------------------------

export type ClientBlockParameter = {
  id: string;
  clientId: string;
  legajo: string;
  correo: string;
  nombre: string;
  /** null = usa el valor general. */
  individualMinWages: number | null;
  companyMinWages: number | null;
  updatedAt: string;
};

type ClientBlockParameterRow = {
  id: string;
  client_id: string;
  legajo: string;
  correo: string;
  nombre: string;
  individual_min_wages: number | null;
  company_min_wages: number | null;
  updated_at: string;
};

export type ClientBlockParameterFilters = Pagination & { search?: string };

const COLS = "id, client_id, legajo, correo, nombre, individual_min_wages, company_min_wages, updated_at";

const toParam = (r: ClientBlockParameterRow): ClientBlockParameter => ({
  id: r.id,
  clientId: r.client_id,
  legajo: r.legajo,
  correo: r.correo,
  nombre: r.nombre,
  individualMinWages: r.individual_min_wages,
  companyMinWages: r.company_min_wages,
  updatedAt: r.updated_at,
});

function filtrar<T extends { or: (f: string) => T }>(q: T, search?: string): T {
  if (!search?.trim()) return q;
  const s = `%${search.trim().replace(/[%_,()]/g, "\\$&")}%`;
  return q.or(`legajo.ilike.${s},correo.ilike.${s},nombre.ilike.${s}`);
}

export async function listClientBlockParameters(
  filters: ClientBlockParameterFilters,
): Promise<Page<ClientBlockParameter>> {
  const sb = requireSupabase();
  const { page, pageSize } = filters;
  const from = page * pageSize;
  const q = filtrar(sb.from("v_client_block_parameters").select(COLS, { count: "exact" }), filters.search)
    .order("legajo", { ascending: true })
    .range(from, from + pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as ClientBlockParameterRow[]).map(toParam);
  return { rows, total: count ?? rows.length, page, pageSize };
}

/** Todas las filas que respetan el filtro (para exportar). */
export async function listAllClientBlockParameters(search?: string): Promise<ClientBlockParameter[]> {
  const sb = requireSupabase();
  const { data, error } = await filtrar(sb.from("v_client_block_parameters").select(COLS), search)
    .order("legajo", { ascending: true })
    .limit(10000);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as ClientBlockParameterRow[]).map(toParam);
}

export async function saveClientBlockParameter(input: {
  id?: string;
  legajo: string;
  individualMinWages: number | null;
  companyMinWages: number | null;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("guardar_parametros_bloqueo_cliente", {
    p_legajo: input.legajo,
    p_individual_min_wages: input.individualMinWages,
    p_company_min_wages: input.companyMinWages,
    p_id: input.id ?? null,
  });
  if (error) throw new DataAccessError(error);
}

/** Parámetros individuales de un cliente (null = usa los generales). */
export async function getClientBlockParameter(legajo: string): Promise<ClientBlockParameter | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("v_client_block_parameters").select(COLS).eq("legajo", legajo).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toParam(data as ClientBlockParameterRow) : null;
}

export async function deleteClientBlockParameter(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("eliminar_parametros_bloqueo_cliente", { p_id: id });
  if (error) throw new DataAccessError(error);
}

/** Valores de actividad y provincia que existen en las fichas (para condiciones y montos por actividad). */
export async function listFichaValues(): Promise<{ actividades: string[]; provincias: string[] }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("listar_valores_ficha");
  if (error) throw new DataAccessError(error);
  const d = (data ?? {}) as { actividades?: string[]; provincias?: string[] };
  return { actividades: d.actividades ?? [], provincias: d.provincias ?? [] };
}

// ---------------------------------------------------------------------------
// Perfil transaccional esperado por cliente (public.client_transaction_profiles)
// ---------------------------------------------------------------------------

export type TransactionProfile = {
  id: string;
  clientId: string;
  legajo: string;
  correo: string;
  nombre: string;
  actividad: string | null;
  /** Volumen mensual esperado (ingresos + egresos). */
  monthlyAmount: number;
  monthlyOperations: number | null;
  notes: string | null;
  updatedAt: string;
  currentMonthAmount: number;
  currentMonthOperations: number;
};

type TransactionProfileRow = {
  id: string;
  client_id: string;
  legajo: string;
  correo: string;
  nombre: string;
  actividad: string | null;
  monthly_amount: number | string;
  monthly_operations: number | null;
  notes: string | null;
  updated_at: string;
  current_month_amount: number | string;
  current_month_operations: number | string;
};

const PROFILE_COLS =
  "id, client_id, legajo, correo, nombre, actividad, monthly_amount, monthly_operations, notes, updated_at, current_month_amount, current_month_operations";

const toProfile = (r: TransactionProfileRow): TransactionProfile => ({
  id: r.id,
  clientId: r.client_id,
  legajo: r.legajo,
  correo: r.correo,
  nombre: r.nombre,
  actividad: r.actividad,
  monthlyAmount: Number(r.monthly_amount),
  monthlyOperations: r.monthly_operations,
  notes: r.notes,
  updatedAt: r.updated_at,
  currentMonthAmount: Number(r.current_month_amount),
  currentMonthOperations: Number(r.current_month_operations),
});

export async function listTransactionProfiles(filters: Pagination & { search?: string }): Promise<Page<TransactionProfile>> {
  const sb = requireSupabase();
  const from = filters.page * filters.pageSize;
  const { data, error, count } = await filtrar(
    sb.from("v_client_transaction_profiles").select(PROFILE_COLS, { count: "exact" }),
    filters.search,
  )
    .order("legajo", { ascending: true })
    .range(from, from + filters.pageSize - 1);
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as TransactionProfileRow[]).map(toProfile);
  return { rows, total: count ?? rows.length, page: filters.page, pageSize: filters.pageSize };
}

export async function listAllTransactionProfiles(search?: string): Promise<TransactionProfile[]> {
  const sb = requireSupabase();
  const { data, error } = await filtrar(sb.from("v_client_transaction_profiles").select(PROFILE_COLS), search)
    .order("legajo", { ascending: true })
    .limit(10000);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as TransactionProfileRow[]).map(toProfile);
}

/** Perfil transaccional de un cliente con su consumo del mes (null = sin perfil). */
export async function getTransactionProfile(legajo: string): Promise<TransactionProfile | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("v_client_transaction_profiles").select(PROFILE_COLS).eq("legajo", legajo).maybeSingle();
  if (error) throw new DataAccessError(error);
  return data ? toProfile(data as TransactionProfileRow) : null;
}

export async function saveTransactionProfile(input: {
  legajo: string;
  monthlyAmount: number;
  monthlyOperations: number | null;
  notes: string | null;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("guardar_perfil_transaccional", {
    p_legajo: input.legajo,
    p_monthly_amount: input.monthlyAmount,
    p_monthly_operations: input.monthlyOperations,
    p_notes: input.notes,
  });
  if (error) throw new DataAccessError(error);
}

export async function deleteTransactionProfile(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("eliminar_perfil_transaccional", { p_id: id });
  if (error) throw new DataAccessError(error);
}

/** CSV con comillas y separador coma (Excel lo abre bien con BOM). */
export function descargarCsv(nombre: string, cabecera: string[], filas: (string | number | null)[][]): void {
  const celda = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cabecera, ...filas].map((f) => f.map(celda).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
