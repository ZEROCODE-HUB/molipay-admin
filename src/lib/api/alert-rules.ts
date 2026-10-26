import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

// Configuracion de reglas de monitoreo (tabla public.alert_rules).
// Fase 1: solo configuracion; el motor que las evalua llega despues.

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
  | "plaft_screening";

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
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
};

export async function listAlertRules(): Promise<AlertRule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("alert_rules")
    .select("id, code, name, category, description, action, parameters, is_enabled, sort_order, updated_at")
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
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  }));
}

/** Guarda varias reglas en una sola transaccion (la base valida cada una). */
export async function saveAlertRules(
  rules: { code: AlertRuleCode; isEnabled: boolean; parameters: Record<string, unknown> }[],
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("guardar_alert_rules", {
    p_rules: rules.map((r) => ({ code: r.code, is_enabled: r.isEnabled, parameters: r.parameters })),
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

export async function deleteClientBlockParameter(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("eliminar_parametros_bloqueo_cliente", { p_id: id });
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
