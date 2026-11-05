/** Registros de actividad del backoffice: eventos de seguridad y auditoria RBAC. */

export type Page<T, C> = { rows: T[]; nextCursor: C | null };

// ---------------------------------------------------------------------------
// Eventos de seguridad
// ---------------------------------------------------------------------------

export const SECURITY_EVENT_CATEGORIES = [
  "authentication",
  "session",
  "api_key",
  "admin_user",
  "access",
  "configuration",
] as const;
export const SECURITY_EVENT_OUTCOMES = ["success", "failure", "denied"] as const;
export const SECURITY_EVENT_SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export const SECURITY_ACTOR_TYPES = [
  "user",
  "staff",
  "service",
  "anonymous",
  "system",
  "unknown",
] as const;

export type SecurityEventCategory = (typeof SECURITY_EVENT_CATEGORIES)[number];
export type SecurityEventOutcome = (typeof SECURITY_EVENT_OUTCOMES)[number];
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];
export type SecurityActorType = (typeof SECURITY_ACTOR_TYPES)[number];

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

// ---------------------------------------------------------------------------
// Auditoria RBAC
// ---------------------------------------------------------------------------

export const RBAC_AUDIT_OPERATIONS = ["INSERT", "UPDATE", "DELETE", "EVENT"] as const;

export type RbacAuditTable =
  | "roles"
  | "role_permissions"
  | "backoffice_users"
  | "permissions"
  | "permission_modules";
export type RbacAuditOperation = (typeof RBAC_AUDIT_OPERATIONS)[number];

export type RbacAuditEntry = {
  id: string;
  createdAt: string;
  tableName: RbacAuditTable | string;
  operation: RbacAuditOperation;
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
