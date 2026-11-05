import {
type SecurityActorType,
type SecurityEvent,
type SecurityEventCategory,
type SecurityEventFilters,
type SecurityEventOutcome,
type SecurityEventSeverity,
} from "@/features/activity/activity.types";
import { isAppError } from "@/shared/lib/errors";
import { downloadXlsx } from "@/shared/lib/download";
import { formatDateTime } from "@/shared/lib/format";

export const CATEGORY_LABELS: Record<SecurityEventCategory, string> = {
  authentication: "Autenticación",
  session: "Sesiones",
  api_key: "API keys",
  admin_user: "Usuarios backoffice",
  access: "Accesos",
  configuration: "Configuración",
};

export const OUTCOME: Record<
  SecurityEventOutcome,
  { label: string; tone: "success" | "danger" | "warn" }
> = {
  success: { label: "Exitoso", tone: "success" },
  failure: { label: "Fallido", tone: "danger" },
  denied: { label: "Denegado", tone: "warn" },
};

export const SEVERITY: Record<
  SecurityEventSeverity,
  { label: string; tone: "neutral" | "warn" | "danger" }
> = {
  info: { label: "Info", tone: "neutral" },
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "warn" },
  high: { label: "Alta", tone: "danger" },
  critical: { label: "Crítica", tone: "danger" },
};

export const ACTOR_TYPE_LABELS: Record<SecurityActorType, string> = {
  user: "Usuario",
  staff: "Backoffice",
  service: "Servicio",
  anonymous: "Anónimo",
  system: "Sistema",
  unknown: "Desconocido",
};

export function actorLabel(e: SecurityEvent): string {
  return e.actorEmail ?? ACTOR_TYPE_LABELS[e.actorType];
}

export function targetLabel(e: SecurityEvent): string {
  if (e.targetEmail) return e.targetEmail;
  if (e.targetType && e.targetId) return `${e.targetType} ${e.targetId.slice(0, 8)}`;
  return "—";
}

export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isAppError(error) && error.kind === "permission") {
    return "No tenés permiso para ver los eventos de seguridad.";
  }
  return "No se pudieron cargar los eventos. Probá de nuevo.";
}

export function exportToExcel(rows: SecurityEvent[]) {
  downloadXlsx(
    `eventos_seguridad_${new Date().toISOString().slice(0, 10)}.xlsx`,
    rows.map((e) => ({
      Fecha: formatDateTime(e.occurredAt, { seconds: true }),
      Evento: e.label,
      Código: e.action,
      Categoría: CATEGORY_LABELS[e.category],
      Resultado: OUTCOME[e.outcome].label,
      Severidad: SEVERITY[e.severity].label,
      Actor: actorLabel(e),
      "Tipo de actor": ACTOR_TYPE_LABELS[e.actorType],
      Afectado: targetLabel(e),
      IP: e.ip ?? "",
      Origen: e.source,
    })),
    { sheetName: "Eventos de seguridad" },
  );
}

export const EMPTY_FILTERS: SecurityEventFilters = {};
