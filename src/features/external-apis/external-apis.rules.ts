import type {
ApiEnvironment,
EndpointPermission,
EndpointStatus,
IntegrationStatus,
ReasonAction,
WebhookDeliveryStatus,
} from "./external-apis.types";

type Tone = "success" | "neutral" | "warn" | "danger";

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  pending_validation: "Pendiente de validación",
  sandbox: "Sandbox",
  pending_production: "Pase a producción pendiente",
  production: "Producción",
  suspended: "Suspendida",
  revoked: "Revocada",
};

/** Orden del filtro: primero lo que requiere accion. */
export const INTEGRATION_STATUS_FILTER: IntegrationStatus[] = [
  "pending_production",
  "sandbox",
  "production",
  "suspended",
  "revoked",
  "pending_validation",
];

export function integrationStatusTone(status: IntegrationStatus): Tone {
  if (status === "production") return "success";
  if (status === "suspended" || status === "revoked") return "danger";
  if (status === "pending_production" || status === "pending_validation") return "warn";
  return "neutral";
}

/** Estado tal como lo guarda la base (el historial trae texto) -> etiqueta. */
const DB_STATUS_LABEL: Record<string, string> = {
  Pendiente_Validacion: INTEGRATION_STATUS_LABEL.pending_validation,
  Homologacion: INTEGRATION_STATUS_LABEL.sandbox,
  Pendiente_Pase_Produccion: INTEGRATION_STATUS_LABEL.pending_production,
  Produccion: INTEGRATION_STATUS_LABEL.production,
  Suspendido: INTEGRATION_STATUS_LABEL.suspended,
  Revocado: INTEGRATION_STATUS_LABEL.revoked,
};
export const historyStatusLabel = (dbStatus: string) => DB_STATUS_LABEL[dbStatus] ?? dbStatus;

export const ENVIRONMENT_LABEL: Record<ApiEnvironment, string> = {
  sandbox: "Sandbox",
  production: "Producción",
};

export const DELIVERY_STATUS_LABEL: Record<WebhookDeliveryStatus, string> = {
  pending: "Pendiente",
  sending: "Enviando",
  succeeded: "Exitoso",
  retrying: "Reintentando",
  failed: "Fallido",
};

export const deliveryStatusTone = (s: WebhookDeliveryStatus): Tone =>
  s === "succeeded" ? "success" : s === "failed" ? "danger" : "warn";

/** Color del status HTTP de un log. */
export const httpStatusClass = (status: number) =>
  status < 300 ? "text-emerald-700" : status < 500 ? "text-amber-700" : "text-red-700";

export const ENDPOINT_STATUS_LABEL: Record<EndpointStatus, string> = {
  enabled: "Habilitado",
  disabled: "Deshabilitado",
};

export const HTTP_METHOD_CLASS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-emerald-100 text-emerald-700",
  DELETE: "bg-red-100 text-red-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-amber-100 text-amber-700",
};

export const REASON_ACTION_COPY: Record<ReasonAction, { title: string; submitLabel: string }> = {
  suspend: { title: "Suspender integración", submitLabel: "Suspender" },
  revoke: { title: "Revocar integración", submitLabel: "Revocar" },
  reject: { title: "Rechazar pase a producción", submitLabel: "Rechazar" },
};

export function reasonActionDescription(action: ReasonAction, merchantName: string): string {
  if (action === "suspend")
    return `Corta al instante todo el tráfico de API de ${merchantName} (403). Se puede reactivar.`;
  if (action === "revoke")
    return `Anula las llaves y desactiva los webhooks de ${merchantName}. No se puede reactivar: el comercio tiene que empezar de nuevo con un Sandbox.`;
  return `La integración de ${merchantName} vuelve a Sandbox. El comercio ve el motivo.`;
}

/** Parsea la lista de IPs escrita a mano (una por linea, o separadas por coma / punto y coma). */
export const parseIpList = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((ip) => ip.trim())
    .filter(Boolean);

// --- Permisos por endpoint -------------------------------------------------------

/** Regla guardada del endpoint en el ambiente (null = sin configurar: hoy se rechaza). */
export const storedPermission = (p: EndpointPermission, env: ApiEnvironment) =>
  env === "sandbox" ? p.sandbox : p.production;

/** El catalogo no permite tildarlo (endpoint deshabilitado o no disponible en el ambiente). */
export const isPermissionLocked = (p: EndpointPermission, env: ApiEnvironment) =>
  p.status !== "Habilitado" || !p.environments.includes(env);

export type PermissionMatrix = Record<string, boolean>;

export function matrixFromServer(
  permissions: EndpointPermission[],
  env: ApiEnvironment,
): PermissionMatrix {
  return Object.fromEntries(permissions.map((p) => [p.endpointId, !!storedPermission(p, env)]));
}

/** Endpoints que se guardarian: los que cambiaron y los que todavia no tienen regla. */
export const changedPermissions = (
  permissions: EndpointPermission[],
  env: ApiEnvironment,
  matrix: PermissionMatrix,
) =>
  permissions.filter((p) => {
    const stored = storedPermission(p, env);
    return stored === null || !!stored !== !!matrix[p.endpointId];
  });

/** Agrupa los metodos por path, en el orden en que vienen. */
export function groupByPath(permissions: EndpointPermission[]): [string, EndpointPermission[]][] {
  const groups = new Map<string, EndpointPermission[]>();
  for (const p of permissions) groups.set(p.path, [...(groups.get(p.path) ?? []), p]);
  return [...groups.entries()];
}
