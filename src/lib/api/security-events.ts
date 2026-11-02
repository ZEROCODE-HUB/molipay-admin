import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

/**
 * Registros de actividad del backoffice (migracion 20261104130000_security_events).
 *
 * - security_events: autenticacion, API keys, usuarios del backoffice y accesos
 *   denegados. RPC security_events_list (permiso backoffice.security_events.read).
 * - rbac_audit_log: cambios de roles, permisos y rol asignado. RPC rbac_audit_list
 *   (permiso backoffice.audit.read).
 *
 * Ambos paginan con cursor (fecha + id, descendente): la RPC devuelve una fila
 * de mas para saber si hay pagina siguiente.
 */

export const ACTIVITY_PAGE_SIZE = 50;

export type Page<T, C> = { rows: T[]; nextCursor: C | null };

function toPage<T, C>(rows: T[], limit: number, cursorOf: (row: T) => C): Page<T, C> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;
  return { rows: visible, nextCursor: hasMore ? cursorOf(visible[visible.length - 1]) : null };
}

// ============================================================================
// Eventos de seguridad
// ============================================================================

export type SecurityEventCategory =
  | "authentication"
  | "session"
  | "api_key"
  | "admin_user"
  | "access"
  | "configuration";
export type SecurityEventOutcome = "success" | "failure" | "denied";
export type SecurityEventSeverity = "info" | "low" | "medium" | "high" | "critical";
export type SecurityActorType = "user" | "staff" | "service" | "anonymous" | "system" | "unknown";

export type SecurityEvent = {
  id: number;
  occurredAt: string;
  action: string;
  label: string;
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  outcome: SecurityEventOutcome;
  actorType: SecurityActorType;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  source: string;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

export type SecurityEventType = {
  action: string;
  category: SecurityEventCategory;
  label: string;
  isEnabled: boolean;
};

export type SecurityEventFilters = {
  category?: SecurityEventCategory | null;
  action?: string | null;
  outcome?: SecurityEventOutcome | null;
  severity?: SecurityEventSeverity | null;
  /** Email (parcial), IP, id del objetivo o request id. */
  search?: string | null;
  /** Fechas YYYY-MM-DD (inclusive). */
  from?: string | null;
  to?: string | null;
};

export type SecurityEventCursor = { occurredAt: string; id: number };

type SecurityEventRow = {
  id: number;
  occurred_at: string;
  action: string;
  label: string;
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  outcome: SecurityEventOutcome;
  actor_type: SecurityActorType;
  actor_id: string | null;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  tenant_id: string | null;
  ip: string | null;
  user_agent: string | null;
  source: string;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
};

/** Inicio del dia siguiente (filtro "hasta" inclusive). */
function dayAfter(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export async function fetchSecurityEvents(
  filters: SecurityEventFilters,
  cursor: SecurityEventCursor | null,
  limit = ACTIVITY_PAGE_SIZE,
): Promise<Page<SecurityEvent, SecurityEventCursor>> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("security_events_list", {
    p_category: filters.category || null,
    p_action: filters.action || null,
    p_outcome: filters.outcome || null,
    p_severity: filters.severity || null,
    p_search: filters.search?.trim() || null,
    p_from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null,
    p_to: filters.to ? dayAfter(filters.to) : null,
    p_cursor_at: cursor?.occurredAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as SecurityEventRow[]).map(
    (r): SecurityEvent => ({
      id: r.id,
      occurredAt: r.occurred_at,
      action: r.action,
      label: r.label,
      category: r.category,
      severity: r.severity,
      outcome: r.outcome,
      actorType: r.actor_type,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      targetType: r.target_type,
      targetId: r.target_id,
      targetUserId: r.target_user_id,
      targetEmail: r.target_email,
      tenantId: r.tenant_id,
      ip: r.ip,
      userAgent: r.user_agent,
      source: r.source,
      requestId: r.request_id,
      metadata: r.metadata ?? {},
    }),
  );
  return toPage(rows, limit, (r) => ({ occurredAt: r.occurredAt, id: r.id }));
}

export async function fetchSecurityEventTypes(): Promise<SecurityEventType[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("security_event_types")
    .select("action, category, label, is_enabled")
    .order("category")
    .order("label");
  if (error) throw new DataAccessError(error);
  return (data ?? []).map((t) => ({
    action: t.action,
    category: t.category as SecurityEventCategory,
    label: t.label,
    isEnabled: t.is_enabled,
  }));
}

// ============================================================================
// Auditoria RBAC
// ============================================================================

export type RbacAuditTable =
  | "roles"
  | "role_permissions"
  | "backoffice_users"
  | "permissions"
  | "permission_modules";

export type RbacAuditEntry = {
  id: string;
  createdAt: string;
  tableName: RbacAuditTable | string;
  operation: "INSERT" | "UPDATE" | "DELETE" | "EVENT";
  event: string | null;
  rowId: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Nombres de los roles que menciona la fila (id -> nombre). */
  roleNames: Record<string, string>;
  /** Nombres de los permisos que menciona la fila (codigo -> nombre). */
  permissionNames: Record<string, string>;
};

export type RbacAuditFilters = {
  table?: RbacAuditTable | null;
  from?: string | null;
  to?: string | null;
};

export type RbacAuditCursor = { createdAt: string; id: string };

type RbacAuditRow = {
  id: string;
  created_at: string;
  table_name: string;
  operation: RbacAuditEntry["operation"];
  event: string | null;
  row_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  role_names: Record<string, string> | null;
  permission_names: Record<string, string> | null;
};

export async function fetchRbacAudit(
  filters: RbacAuditFilters,
  cursor: RbacAuditCursor | null,
  limit = ACTIVITY_PAGE_SIZE,
): Promise<Page<RbacAuditEntry, RbacAuditCursor>> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("rbac_audit_list", {
    p_table: filters.table || null,
    p_actor_id: null,
    p_from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null,
    p_to: filters.to ? dayAfter(filters.to) : null,
    p_cursor_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as RbacAuditRow[]).map(
    (r): RbacAuditEntry => ({
      id: r.id,
      createdAt: r.created_at,
      tableName: r.table_name,
      operation: r.operation,
      event: r.event,
      rowId: r.row_id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      before: r.before_data,
      after: r.after_data,
      roleNames: r.role_names ?? {},
      permissionNames: r.permission_names ?? {},
    }),
  );
  return toPage(rows, limit, (r) => ({ createdAt: r.createdAt, id: r.id }));
}

export const ACTIVITY_QUERY_KEYS = {
  securityEvents: (filters: SecurityEventFilters) =>
    ["activity", "security-events", filters] as const,
  securityEventTypes: ["activity", "security-event-types"] as const,
  rbacAudit: (filters: RbacAuditFilters) => ["activity", "rbac-audit", filters] as const,
};
