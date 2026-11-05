import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { callRpc } from "@/infrastructure/supabase/rpc";
import { parseEnum } from "@/shared/lib/enum";
import {
RBAC_AUDIT_OPERATIONS,
SECURITY_ACTOR_TYPES,
SECURITY_EVENT_CATEGORIES,
SECURITY_EVENT_OUTCOMES,
SECURITY_EVENT_SEVERITIES,
type Page,
type RbacAuditCursor,
type RbacAuditEntry,
type RbacAuditFilters,
type SecurityEvent,
type SecurityEventCursor,
type SecurityEventFilters,
type SecurityEventType,
} from "./activity.types";

/*
 * Feature chica: sin contrato (Repository). Lo usa solo activity.queries.ts.
 * RPC security_events_list / rbac_audit_list (migraciones 20261104130000 y 140000):
 * paginan con cursor (fecha + id) y devuelven una fila de mas para saber si hay pagina siguiente.
 */

export const ACTIVITY_PAGE_SIZE = 50;

const context = { feature: "activity" };

type ReadOptions = { signal?: AbortSignal };

function toPage<T, C>(rows: T[], limit: number, cursorOf: (row: T) => C): Page<T, C> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;
  return { rows: visible, nextCursor: hasMore ? cursorOf(visible[visible.length - 1]) : null };
}

/** Inicio del dia siguiente (filtro "hasta" inclusive). */
function dayAfter(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

const startOfDay = (date: string) => new Date(`${date}T00:00:00`).toISOString();

// ---------------------------------------------------------------------------
// Eventos de seguridad
// ---------------------------------------------------------------------------

type SecurityEventRow = {
  id: number;
  occurred_at: string;
  action: string;
  label: string;
  category: string;
  severity: string;
  outcome: string;
  actor_type: string;
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

export function toSecurityEvent(r: SecurityEventRow): SecurityEvent {
  return {
    id: r.id,
    occurredAt: r.occurred_at,
    action: r.action,
    label: r.label,
    category: parseEnum(r.category, SECURITY_EVENT_CATEGORIES, "security_events.category"),
    severity: parseEnum(r.severity, SECURITY_EVENT_SEVERITIES, "security_events.severity"),
    outcome: parseEnum(r.outcome, SECURITY_EVENT_OUTCOMES, "security_events.outcome"),
    actorType: parseEnum(r.actor_type, SECURITY_ACTOR_TYPES, "security_events.actor_type"),
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
  };
}

export async function listSecurityEvents(
  filters: SecurityEventFilters,
  cursor: SecurityEventCursor | null,
  { signal }: ReadOptions = {},
  limit = ACTIVITY_PAGE_SIZE,
): Promise<Page<SecurityEvent, SecurityEventCursor>> {
  const rows = await callRpc<SecurityEventRow[] | null>(
    "security_events_list",
    {
      p_category: filters.category || null,
      p_action: filters.action || null,
      p_outcome: filters.outcome || null,
      p_severity: filters.severity || null,
      p_search: filters.search?.trim() || null,
      p_from: filters.from ? startOfDay(filters.from) : null,
      p_to: filters.to ? dayAfter(filters.to) : null,
      p_cursor_at: cursor?.occurredAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
    },
    { signal, context },
  );
  return toPage((rows ?? []).map(toSecurityEvent), limit, (r) => ({
    occurredAt: r.occurredAt,
    id: r.id,
  }));
}

export async function listSecurityEventTypes({ signal }: ReadOptions = {}): Promise<
  SecurityEventType[]
> {
  let query = requireSupabase()
    .from("security_event_types")
    .select("action, category, label, is_enabled")
    .order("category")
    .order("label");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw toAppError(error, { ...context, operation: "security_event_types" });
  return (data ?? []).map((t) => ({
    action: t.action,
    category: parseEnum(t.category, SECURITY_EVENT_CATEGORIES, "security_event_types.category"),
    label: t.label,
    isEnabled: t.is_enabled,
  }));
}

// ---------------------------------------------------------------------------
// Auditoria RBAC
// ---------------------------------------------------------------------------

type RbacAuditRow = {
  id: string;
  created_at: string;
  table_name: string;
  operation: string;
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

export function toRbacAuditEntry(r: RbacAuditRow): RbacAuditEntry {
  return {
    id: r.id,
    createdAt: r.created_at,
    tableName: r.table_name,
    operation: parseEnum(r.operation, RBAC_AUDIT_OPERATIONS, "rbac_audit_log.operation"),
    event: r.event,
    rowId: r.row_id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorEmail: r.actor_email,
    before: r.before_data,
    after: r.after_data,
    roleNames: r.role_names ?? {},
    permissionNames: r.permission_names ?? {},
  };
}

export async function listRbacAudit(
  filters: RbacAuditFilters,
  cursor: RbacAuditCursor | null,
  { signal }: ReadOptions = {},
  limit = ACTIVITY_PAGE_SIZE,
): Promise<Page<RbacAuditEntry, RbacAuditCursor>> {
  const rows = await callRpc<RbacAuditRow[] | null>(
    "rbac_audit_list",
    {
      p_table: filters.table || null,
      p_actor_id: null,
      p_from: filters.from ? startOfDay(filters.from) : null,
      p_to: filters.to ? dayAfter(filters.to) : null,
      p_cursor_at: cursor?.createdAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
    },
    { signal, context },
  );
  return toPage((rows ?? []).map(toRbacAuditEntry), limit, (r) => ({
    createdAt: r.createdAt,
    id: r.id,
  }));
}
