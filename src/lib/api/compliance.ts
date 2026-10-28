import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";
import type { Page, Pagination } from "./types";

// Alertas y bloqueos (vistas v_alerts / v_account_blocks). Las escrituras van
// siempre por RPC: la base valida permisos, transiciones y registra quien actua
// a partir de la sesion (nunca se envia un admin_id desde el front).

const escapeLike = (v: string) => v.trim().replace(/[%_,()]/g, "\\$&");
const MAX_EXPORT = 10000;

// ============================================================================
// Alertas
// ============================================================================

export type AlertStatus = "pending" | "in_review" | "resolved" | "dismissed";
export type AlertResolution = "justified" | "ros" | "false_positive";

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelta",
  dismissed: "Descartada",
};

export const ALERT_RESOLUTION_LABEL: Record<AlertResolution, string> = {
  justified: "Operación justificada",
  ros: "ROS (reporte a UIF)",
  false_positive: "Falso positivo",
};

export type AlertItem = {
  id: string;
  clientId: string;
  legajo: string;
  correo: string;
  nombre: string;
  ruleCode: string | null;
  type: string;
  description: string;
  details: Record<string, unknown>;
  status: AlertStatus;
  isActive: boolean;
  resolution: AlertResolution | null;
  resolutionNotes: string | null;
  createdAt: string;
  dueAt: string;
  acceptedAt: string | null;
  acceptedByName: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  transactionId: string | null;
  idTxn: string | null;
  tipoOperacion: string | null;
  montoOperacion: number | null;
  fechaOperacion: string | null;
  plaftMatchId: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  /** Activa y con el plazo de 90 días vencido. */
  isOverdue: boolean;
  commentsCount: number;
  attachmentsCount: number;
  actividad: string | null;
  provincia: string | null;
};

type AlertRow = {
  id: string;
  client_id: string;
  legajo: string;
  correo: string;
  nombre: string;
  rule_code: string | null;
  type: string;
  description: string;
  details: Record<string, unknown> | null;
  status: AlertStatus;
  is_active: boolean;
  resolution: AlertResolution | null;
  resolution_notes: string | null;
  created_at: string;
  due_at: string;
  accepted_at: string | null;
  accepted_by_name: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
  transaction_id: string | null;
  id_txn: string | null;
  tipo_operacion: string | null;
  monto_operacion: number | string | null;
  fecha_operacion: string | null;
  plaft_match_id: number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_at: string | null;
  is_overdue: boolean;
  comments_count: number;
  attachments_count: number;
  actividad: string | null;
  provincia: string | null;
};

const ALERT_COLS =
  "id, client_id, legajo, correo, nombre, rule_code, type, description, details, status, is_active, resolution, resolution_notes, created_at, due_at, accepted_at, accepted_by_name, resolved_at, resolved_by_name, transaction_id, id_txn, tipo_operacion, monto_operacion, fecha_operacion, plaft_match_id, assigned_to, assigned_to_name, assigned_at, is_overdue, comments_count, attachments_count, actividad, provincia";

const toAlert = (r: AlertRow): AlertItem => ({
  id: r.id,
  clientId: r.client_id,
  legajo: r.legajo,
  correo: r.correo,
  nombre: r.nombre,
  ruleCode: r.rule_code,
  type: r.type,
  description: r.description,
  details: r.details ?? {},
  status: r.status,
  isActive: r.is_active,
  resolution: r.resolution,
  resolutionNotes: r.resolution_notes,
  createdAt: r.created_at,
  dueAt: r.due_at,
  acceptedAt: r.accepted_at,
  acceptedByName: r.accepted_by_name,
  resolvedAt: r.resolved_at,
  resolvedByName: r.resolved_by_name,
  transactionId: r.transaction_id,
  idTxn: r.id_txn,
  tipoOperacion: r.tipo_operacion,
  montoOperacion: r.monto_operacion == null ? null : Number(r.monto_operacion),
  fechaOperacion: r.fecha_operacion,
  plaftMatchId: r.plaft_match_id,
  assignedTo: r.assigned_to,
  assignedToName: r.assigned_to_name,
  assignedAt: r.assigned_at,
  isOverdue: r.is_overdue,
  commentsCount: Number(r.comments_count ?? 0),
  attachmentsCount: Number(r.attachments_count ?? 0),
  actividad: r.actividad,
  provincia: r.provincia,
});

export type AlertFilters = {
  /** Legajo, correo, nombre o tipo de alerta. */
  search?: string;
  status?: AlertStatus;
  /** true = pendiente o en revisión; false = cerrada. */
  active?: boolean;
  createdFrom?: string;
  createdTo?: string;
  acceptedFrom?: string;
  acceptedTo?: string;
  /** true = activas con el plazo vencido. */
  overdue?: boolean;
  /** id del analista; "none" = sin asignar. */
  assignedTo?: string;
  /** Solo las alertas de este cliente (ficha). */
  legajo?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filtrosAlertas(q: any, f: AlertFilters) {
  if (f.search?.trim()) {
    const s = `%${escapeLike(f.search)}%`;
    q = q.or(`legajo.ilike.${s},correo.ilike.${s},nombre.ilike.${s},type.ilike.${s}`);
  }
  if (f.legajo) q = q.eq("legajo", f.legajo);
  if (f.status) q = q.eq("status", f.status);
  if (f.active !== undefined) q = q.eq("is_active", f.active);
  if (f.createdFrom) q = q.gte("created_at", `${f.createdFrom}T00:00:00`);
  if (f.createdTo) q = q.lte("created_at", `${f.createdTo}T23:59:59.999`);
  if (f.acceptedFrom) q = q.gte("accepted_at", `${f.acceptedFrom}T00:00:00`);
  if (f.acceptedTo) q = q.lte("accepted_at", `${f.acceptedTo}T23:59:59.999`);
  if (f.overdue !== undefined) q = q.eq("is_overdue", f.overdue);
  if (f.assignedTo === "none") q = q.is("assigned_to", null);
  else if (f.assignedTo) q = q.eq("assigned_to", f.assignedTo);
  return q.order("created_at", { ascending: false });
}

export async function listAlerts(f: AlertFilters & Pagination): Promise<Page<AlertItem>> {
  const sb = requireSupabase();
  const from = f.page * f.pageSize;
  const { data, error, count } = await filtrosAlertas(
    sb.from("v_alerts").select(ALERT_COLS, { count: "exact" }),
    f,
  ).range(from, from + f.pageSize - 1);
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as AlertRow[]).map(toAlert);
  return { rows, total: count ?? rows.length, page: f.page, pageSize: f.pageSize };
}

/** Todas las alertas que cumplen el filtro (para el CSV). */
export async function listAllAlerts(f: AlertFilters): Promise<AlertItem[]> {
  const sb = requireSupabase();
  const { data, error } = await filtrosAlertas(sb.from("v_alerts").select(ALERT_COLS), f).limit(MAX_EXPORT);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as AlertRow[]).map(toAlert);
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new DataAccessError(error);
  return data as T;
}

export const acceptAlert = (id: string) => rpc("aceptar_alerta", { p_id: id });

export const resolveAlert = (id: string, resolution: AlertResolution, notes: string) =>
  rpc("resolver_alerta", { p_id: id, p_resolution: resolution, p_notes: notes });

/** Barrido manual (reemplaza al cron mientras no exista): consume coincidencias PLAFT pendientes. */
export const runComplianceSweep = () =>
  rpc<{
    coincidencias_revisadas: number;
    alertas_nuevas: number;
    clientes_revisados?: number;
    alertas_jurisdiccion_nuevas?: number;
    ultima_corrida_plaft: string | null;
  }>(
    "ejecutar_barrido_compliance",
    {},
  );

export type SimulatedDeposit = {
  estado: string;
  idCoelsa?: string;
  importe?: number;
  comision?: number;
  impuesto?: number;
  retenido?: boolean;
  decision?: string;
};

/** Depósito entrante simulado (solo desarrollo) para probar las reglas de depósitos. */
export const simulateDeposit = (input: { cbuDestino: string; importe: number; cuitOrigen?: string; titularOrigen?: string; cbuOrigen?: string }) =>
  rpc<SimulatedDeposit>("simular_deposito_entrante", {
    p_cbu_destino: input.cbuDestino,
    p_importe: input.importe,
    p_cuit_origen: input.cuitOrigen || null,
    p_titular_origen: input.titularOrigen || null,
    p_cbu_origen: input.cbuOrigen || null,
  });

export type SimulatedHistory = {
  estado: string;
  legajo?: string;
  mes?: string;
  cantidad?: number;
  montoTotal?: number;
  idsTxn?: string[];
};

/**
 * Historial simulado (solo desarrollo): depósitos ya contabilizados con fecha de
 * un mes anterior, repartidos en el mes. No evalúa reglas ni genera alertas.
 */
export const simulateHistory = (input: { cbuDestino: string; montoTotal: number; cantidad: number; mesesAtras: number }) =>
  rpc<SimulatedHistory>("simular_historial_depositos", {
    p_cbu_destino: input.cbuDestino,
    p_monto_total: input.montoTotal,
    p_cantidad: input.cantidad,
    p_meses_atras: input.mesesAtras,
  });

// ============================================================================
// Gestión: analista, comentarios y documentación respaldatoria
// ============================================================================

export type Analyst = { id: string; nombre: string; email: string };

export const listAnalysts = () => rpc<Analyst[]>("listar_analistas", {});

/** Asigna o reasigna el analista responsable (queda en el historial de la alerta). */
export const assignAlert = (id: string, analystId: string) =>
  rpc("asignar_alerta", { p_id: id, p_analyst_id: analystId });

export type AlertComment = {
  id: string;
  kind: "comment" | "system";
  body: string;
  createdAt: string;
  authorName: string | null;
};

export async function listAlertComments(alertId: string): Promise<AlertComment[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_alert_comments")
    .select("id, kind, body, created_at, author_name")
    .eq("alert_id", alertId)
    .order("created_at", { ascending: true });
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as { id: string; kind: AlertComment["kind"]; body: string; created_at: string; author_name: string | null }[]).map(
    (r) => ({ id: r.id, kind: r.kind, body: r.body, createdAt: r.created_at, authorName: r.author_name }),
  );
}

export const addAlertComment = (alertId: string, body: string) =>
  rpc<string>("comentar_alerta", { p_alert_id: alertId, p_body: body });

export const ALERT_ATTACHMENTS_BUCKET = "alert-attachments";
export const ALERT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ALERT_ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt";

export type AlertAttachment = {
  id: string;
  commentId: string | null;
  path: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  uploadedByName: string | null;
};

export async function listAlertAttachments(alertId: string): Promise<AlertAttachment[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("v_alert_attachments")
    .select("id, comment_id, storage_path, file_name, mime_type, size_bytes, created_at, uploaded_by_name")
    .eq("alert_id", alertId)
    .order("created_at", { ascending: true });
  if (error) throw new DataAccessError(error);
  return (
    (data ?? []) as {
      id: string;
      comment_id: string | null;
      storage_path: string;
      file_name: string;
      mime_type: string | null;
      size_bytes: number | string | null;
      created_at: string;
      uploaded_by_name: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    commentId: r.comment_id,
    path: r.storage_path,
    fileName: r.file_name,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes == null ? null : Number(r.size_bytes),
    createdAt: r.created_at,
    uploadedByName: r.uploaded_by_name,
  }));
}

/**
 * Sube un archivo al bucket privado ({alertId}/{timestamp}_{nombre}) y lo registra
 * en la alerta. Tamaño y tipo los toma la base del propio storage.
 */
export async function uploadAlertAttachment(alertId: string, file: File, commentId?: string | null): Promise<void> {
  if (file.size > ALERT_ATTACHMENT_MAX_BYTES) throw new Error(`"${file.name}" supera los 10 MB`);
  const sb = requireSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${alertId}/${Date.now()}_${safeName}`;
  const { error } = await sb.storage
    .from(ALERT_ATTACHMENTS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(`No se pudo subir "${file.name}": ${error.message}`);
  await rpc("registrar_adjunto_alerta", {
    p_alert_id: alertId,
    p_path: path,
    p_file_name: file.name,
    p_comment_id: commentId ?? null,
  });
}

/** URL firmada de corta duración (el bucket es privado). */
export async function getAlertAttachmentUrl(path: string): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.storage.from(ALERT_ATTACHMENTS_BUCKET).createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ============================================================================
// Bloqueos
// ============================================================================

export type BlockStatus = "active" | "released";
export type ComplianceStatus = "pending" | "accepted";
export type BlockScope = "client" | "subaccount";

export type AccountBlock = {
  id: string;
  clientId: string;
  legajo: string;
  correo: string;
  nombre: string;
  scope: BlockScope;
  subaccountId: string | null;
  subcuentaNombre: string | null;
  subcuentaCvu: string | null;
  origin: "rule" | "manual";
  ruleName: string | null;
  alertId: string | null;
  transactionId: string | null;
  idTxn: string | null;
  reason: string;
  blockStatus: BlockStatus;
  complianceStatus: ComplianceStatus;
  blockedAt: string;
  blockedByName: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  releasedAt: string | null;
  releasedByName: string | null;
  releaseNotes: string | null;
  /** Depósitos retenidos por este bloqueo, aún no liberados (neto de comisión e IVA). */
  heldAmount: number;
};

type BlockRow = {
  id: string;
  client_id: string;
  legajo: string;
  correo: string;
  nombre: string;
  scope: BlockScope;
  subaccount_id: string | null;
  subcuenta_nombre: string | null;
  subcuenta_cvu: string | null;
  origin: "rule" | "manual";
  rule_name: string | null;
  alert_id: string | null;
  transaction_id: string | null;
  id_txn: string | null;
  reason: string;
  block_status: BlockStatus;
  compliance_status: ComplianceStatus;
  blocked_at: string;
  blocked_by_name: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  released_at: string | null;
  released_by_name: string | null;
  release_notes: string | null;
  held_amount: number | string;
};

const BLOCK_COLS =
  "id, client_id, legajo, correo, nombre, scope, subaccount_id, subcuenta_nombre, subcuenta_cvu, origin, rule_name, alert_id, transaction_id, id_txn, reason, block_status, compliance_status, blocked_at, blocked_by_name, accepted_at, accepted_by_name, released_at, released_by_name, release_notes, held_amount";

const toBlock = (r: BlockRow): AccountBlock => ({
  id: r.id,
  clientId: r.client_id,
  legajo: r.legajo,
  correo: r.correo,
  nombre: r.nombre,
  scope: r.scope,
  subaccountId: r.subaccount_id,
  subcuentaNombre: r.subcuenta_nombre,
  subcuentaCvu: r.subcuenta_cvu,
  origin: r.origin,
  ruleName: r.rule_name,
  alertId: r.alert_id,
  transactionId: r.transaction_id,
  idTxn: r.id_txn,
  reason: r.reason,
  blockStatus: r.block_status,
  complianceStatus: r.compliance_status,
  blockedAt: r.blocked_at,
  blockedByName: r.blocked_by_name,
  acceptedAt: r.accepted_at,
  acceptedByName: r.accepted_by_name,
  releasedAt: r.released_at,
  releasedByName: r.released_by_name,
  releaseNotes: r.release_notes,
  heldAmount: Number(r.held_amount ?? 0),
});

export type BlockFilters = {
  /** Legajo, correo, nombre o motivo. */
  search?: string;
  scope?: BlockScope;
  blockStatus?: BlockStatus;
  complianceStatus?: ComplianceStatus;
  blockedFrom?: string;
  blockedTo?: string;
  acceptedFrom?: string;
  acceptedTo?: string;
  /** Solo los bloqueos de este cliente (ficha). */
  legajo?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filtrosBloqueos(q: any, f: BlockFilters) {
  if (f.search?.trim()) {
    const s = `%${escapeLike(f.search)}%`;
    q = q.or(`legajo.ilike.${s},correo.ilike.${s},nombre.ilike.${s},reason.ilike.${s}`);
  }
  if (f.legajo) q = q.eq("legajo", f.legajo);
  if (f.scope) q = q.eq("scope", f.scope);
  if (f.blockStatus) q = q.eq("block_status", f.blockStatus);
  if (f.complianceStatus) q = q.eq("compliance_status", f.complianceStatus);
  if (f.blockedFrom) q = q.gte("blocked_at", `${f.blockedFrom}T00:00:00`);
  if (f.blockedTo) q = q.lte("blocked_at", `${f.blockedTo}T23:59:59.999`);
  if (f.acceptedFrom) q = q.gte("accepted_at", `${f.acceptedFrom}T00:00:00`);
  if (f.acceptedTo) q = q.lte("accepted_at", `${f.acceptedTo}T23:59:59.999`);
  return q.order("blocked_at", { ascending: false });
}

export async function listBlocks(f: BlockFilters & Pagination): Promise<Page<AccountBlock>> {
  const sb = requireSupabase();
  const from = f.page * f.pageSize;
  const { data, error, count } = await filtrosBloqueos(
    sb.from("v_account_blocks").select(BLOCK_COLS, { count: "exact" }),
    f,
  ).range(from, from + f.pageSize - 1);
  if (error) throw new DataAccessError(error);
  const rows = ((data ?? []) as BlockRow[]).map(toBlock);
  return { rows, total: count ?? rows.length, page: f.page, pageSize: f.pageSize };
}

export async function listAllBlocks(f: BlockFilters): Promise<AccountBlock[]> {
  const sb = requireSupabase();
  const { data, error } = await filtrosBloqueos(sb.from("v_account_blocks").select(BLOCK_COLS), f).limit(MAX_EXPORT);
  if (error) throw new DataAccessError(error);
  return ((data ?? []) as BlockRow[]).map(toBlock);
}

export const createManualBlock = (input: { legajo: string; subaccountId: string | null; reason: string }) =>
  rpc<string>("crear_bloqueo_manual", { p_legajo: input.legajo, p_subaccount_id: input.subaccountId, p_reason: input.reason });

export const acceptBlock = (id: string) => rpc("aceptar_bloqueo", { p_id: id });

export const releaseBlock = (id: string, notes: string) =>
  rpc<{ ok: boolean; depositos_liberados: number; monto_liberado: number }>("liberar_bloqueo", { p_id: id, p_notes: notes });

// ============================================================================
// SMVM (valor de referencia de las reglas en salarios mínimos)
// ============================================================================

export const readSmvm = () => rpc<number>("leer_smvm", {}).then((v) => Number(v ?? 0));
export const saveSmvm = (monto: number) => rpc("guardar_smvm", { p_monto: monto });
