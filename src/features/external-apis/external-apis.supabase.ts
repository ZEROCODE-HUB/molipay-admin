import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { escapeLike } from "@/infrastructure/supabase/query-helpers";
import { callRpc } from "@/infrastructure/supabase/rpc";
import { parseEnumMap } from "@/shared/lib/enum";
import { AppError } from "@/shared/lib/errors";
import type {
ApiEndpoint,
ApiEndpointFilters,
ApiEndpointInput,
ApiEndpointPage,
ApiEnvironment,
ApiIntegration,
ApiKey,
ApiRequestLog,
EndpointGroup,
EndpointPermission,
EndpointStatus,
HttpMethod,
IntegrationDetail,
IntegrationStatus,
Webhook,
WebhookDelivery,
WebhookDeliveryStatus,
} from "./external-apis.types";

/*
 * Sin contrato: lo usa solo external-apis.queries.ts / .hooks.ts.
 * Integraciones: todo pasa por RPCs del backoffice (las tablas no se tocan directo).
 * Catalogo de endpoints: tabla api_endpoints.
 */

const context = (operation: string) => ({ context: { feature: "external-apis", operation } });

// --- Valores de la base <-> codigo ---------------------------------------------

type DbIntegrationStatus =
  | "Pendiente_Validacion"
  | "Homologacion"
  | "Pendiente_Pase_Produccion"
  | "Produccion"
  | "Suspendido"
  | "Revocado";
const INTEGRATION_STATUS: Record<DbIntegrationStatus, IntegrationStatus> = {
  Pendiente_Validacion: "pending_validation",
  Homologacion: "sandbox",
  Pendiente_Pase_Produccion: "pending_production",
  Produccion: "production",
  Suspendido: "suspended",
  Revocado: "revoked",
};

type DbEnvironment = "Homologacion" | "Produccion";
const ENVIRONMENT: Record<DbEnvironment, ApiEnvironment> = {
  Homologacion: "sandbox",
  Produccion: "production",
};
const DB_ENVIRONMENT: Record<ApiEnvironment, DbEnvironment> = {
  sandbox: "Homologacion",
  production: "Produccion",
};

type DbDeliveryStatus = "Pendiente" | "Enviando" | "Exitoso" | "Reintentando" | "Fallido";
const DELIVERY_STATUS: Record<DbDeliveryStatus, WebhookDeliveryStatus> = {
  Pendiente: "pending",
  Enviando: "sending",
  Exitoso: "succeeded",
  Reintentando: "retrying",
  Fallido: "failed",
};

type DbEndpointStatus = "Habilitado" | "Deshabilitado";
const ENDPOINT_STATUS: Record<DbEndpointStatus, EndpointStatus> = {
  Habilitado: "enabled",
  Deshabilitado: "disabled",
};
const DB_ENDPOINT_STATUS: Record<EndpointStatus, DbEndpointStatus> = {
  enabled: "Habilitado",
  disabled: "Deshabilitado",
};

const toEnvironment = (v: unknown, field: string) => parseEnumMap(v, ENVIRONMENT, field);

// --- Integraciones ------------------------------------------------------------------

type IntegrationRow = {
  id: string;
  comercio_id: string;
  comercio: string;
  legajo: string;
  estado: string;
  pase_solicitado_at: string | null;
  pase_notas: string | null;
  motivo_suspension: string | null;
  rate_limit_sandbox: number;
  rate_limit_produccion: number;
  ips: number;
  llaves: { ambiente: string; api_key: string; ultimo_uso_at: string | null }[];
  requests_24h: number;
  errores_24h: number;
  ultimo_uso_at: string | null;
  webhooks_fallidos: number;
  created_at: string;
  updated_at: string;
};

export const toApiIntegration = (r: IntegrationRow): ApiIntegration => ({
  id: r.id,
  merchantId: r.comercio_id,
  merchantName: r.comercio,
  legajo: r.legajo,
  status: parseEnumMap(r.estado, INTEGRATION_STATUS, "api_integraciones.estado"),
  productionRequestedAt: r.pase_solicitado_at,
  productionRequestNotes: r.pase_notas,
  suspensionReason: r.motivo_suspension,
  sandboxRateLimit: r.rate_limit_sandbox,
  productionRateLimit: r.rate_limit_produccion,
  ipCount: r.ips,
  keys: (r.llaves ?? []).map((k) => ({
    environment: toEnvironment(k.ambiente, "api_llaves.ambiente"),
    apiKey: k.api_key,
    lastUsedAt: k.ultimo_uso_at,
  })),
  requests24h: r.requests_24h,
  errors24h: r.errores_24h,
  lastUsedAt: r.ultimo_uso_at,
  failedWebhooks: r.webhooks_fallidos,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

type DetailRow = {
  integracion: IntegrationRow & {
    ip_whitelist: string[] | null;
    estado_previo: string | null;
    aprobado_at: string | null;
    suspendido_at: string | null;
    motivo_revocacion: string | null;
    historial:
      | { fecha: string; de: string | null; a: string; por: string | null; nota: string | null }[]
      | null;
  };
  llaves: {
    id: string;
    ambiente: string;
    api_key: string;
    estado: "Activa" | "Revocada";
    secret_ultimos4: string;
    created_at: string;
    ultimo_uso_at: string | null;
    revocada_at: string | null;
    revocada_motivo: string | null;
  }[];
  permisos: {
    endpoint_id: string;
    path: string;
    metodo: string;
    nombre: string;
    categoria: string | null;
    estado: string;
    ambientes: string[];
    default_produccion: boolean;
    sandbox: boolean | null;
    produccion: boolean | null;
  }[];
  webhooks: {
    id: string;
    ambiente: string;
    url_callback: string;
    eventos_suscritos: string[];
    activo: boolean;
    updated_at: string;
  }[];
  logs: {
    ambiente: string | null;
    metodo: string;
    ruta: string;
    status: number;
    latencia_ms: number | null;
    ip: string | null;
    codigo_error: string | null;
    request_id: string | null;
    created_at: string;
  }[];
  entregas: {
    id: string;
    ambiente: string;
    evento: string;
    estado: string;
    intento: number;
    http: number | null;
    error: string | null;
    es_prueba: boolean;
    proximo_reintento: string | null;
    created_at: string;
  }[];
};

export function toIntegrationDetail(d: DetailRow): IntegrationDetail {
  const i = d.integracion;
  return {
    integration: {
      ...toApiIntegration(i),
      ipWhitelist: i.ip_whitelist ?? [],
      previousStatus: i.estado_previo,
      approvedAt: i.aprobado_at,
      suspendedAt: i.suspendido_at,
      revocationReason: i.motivo_revocacion,
      history: (i.historial ?? []).map((h) => ({
        at: h.fecha,
        from: h.de,
        to: h.a,
        by: h.por,
        note: h.nota,
      })),
    },
    keys: (d.llaves ?? []).map(
      (k): ApiKey => ({
        id: k.id,
        environment: toEnvironment(k.ambiente, "api_llaves.ambiente"),
        apiKey: k.api_key,
        active: k.estado === "Activa",
        secretLast4: k.secret_ultimos4,
        createdAt: k.created_at,
        lastUsedAt: k.ultimo_uso_at,
        revokedAt: k.revocada_at,
        revokedReason: k.revocada_motivo,
      }),
    ),
    permissions: (d.permisos ?? []).map(
      (p): EndpointPermission => ({
        endpointId: p.endpoint_id,
        path: p.path,
        method: p.metodo,
        name: p.nombre,
        category: p.categoria,
        status: p.estado,
        environments: (p.ambientes ?? []).map((a) => toEnvironment(a, "api_endpoints.ambientes")),
        enabledByDefaultInProduction: p.default_produccion,
        sandbox: p.sandbox,
        production: p.produccion,
      }),
    ),
    webhooks: (d.webhooks ?? []).map(
      (w): Webhook => ({
        id: w.id,
        environment: toEnvironment(w.ambiente, "api_webhooks.ambiente"),
        callbackUrl: w.url_callback,
        events: w.eventos_suscritos ?? [],
        active: w.activo,
        updatedAt: w.updated_at,
      }),
    ),
    logs: (d.logs ?? []).map(
      (l): ApiRequestLog => ({
        environment: l.ambiente ? toEnvironment(l.ambiente, "api_logs.ambiente") : null,
        method: l.metodo,
        path: l.ruta,
        status: l.status,
        latencyMs: l.latencia_ms,
        ip: l.ip,
        errorCode: l.codigo_error,
        requestId: l.request_id,
        createdAt: l.created_at,
      }),
    ),
    deliveries: (d.entregas ?? []).map(
      (e): WebhookDelivery => ({
        id: e.id,
        environment: toEnvironment(e.ambiente, "api_webhook_logs.ambiente"),
        event: e.evento,
        status: parseEnumMap(e.estado, DELIVERY_STATUS, "api_webhook_logs.estado"),
        attempt: e.intento,
        httpStatus: e.http,
        error: e.error,
        isTest: e.es_prueba,
        nextRetryAt: e.proximo_reintento,
        createdAt: e.created_at,
      }),
    ),
  };
}

export async function listIntegrations({ signal }: { signal?: AbortSignal } = {}): Promise<
  ApiIntegration[]
> {
  const rows = await callRpc<IntegrationRow[]>(
    "api_admin_listar",
    {},
    { signal, ...context("list") },
  );
  return (rows ?? []).map(toApiIntegration);
}

export async function getIntegrationDetail(
  id: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<IntegrationDetail> {
  return toIntegrationDetail(
    await callRpc<DetailRow>("api_admin_detalle", { p_id: id }, { signal, ...context("detail") }),
  );
}

const rpc = (name: string, params: Record<string, unknown>) =>
  callRpc<unknown>(name, params, context(name)).then(() => undefined);

export const approveProduction = (id: string, note?: string) =>
  rpc("api_admin_aprobar_pase", { p_id: id, p_nota: note ?? null });
export const rejectProduction = (id: string, reason: string) =>
  rpc("api_admin_rechazar_pase", { p_id: id, p_motivo: reason });
export const suspendIntegration = (id: string, reason: string) =>
  rpc("api_admin_suspender", { p_id: id, p_motivo: reason });
export const reactivateIntegration = (id: string, note?: string) =>
  rpc("api_admin_reactivar", { p_id: id, p_nota: note ?? null });
export const revokeIntegration = (id: string, reason: string) =>
  rpc("api_admin_revocar", { p_id: id, p_motivo: reason });
export const revokeKey = (keyId: string, reason: string) =>
  rpc("api_admin_revocar_llave", { p_key_id: keyId, p_motivo: reason });
export const retryWebhook = (deliveryId: string) =>
  rpc("api_admin_reintentar_webhook", { p_log_id: deliveryId });

export const savePermissions = (
  id: string,
  environment: ApiEnvironment,
  permissions: { endpointId: string; allowed: boolean }[],
) =>
  rpc("api_admin_guardar_permisos", {
    p_id: id,
    p_ambiente: DB_ENVIRONMENT[environment],
    p_permisos: permissions.map((p) => ({ endpoint_id: p.endpointId, permitido: p.allowed })),
  });

export const saveLimits = (
  id: string,
  sandboxRate: number,
  productionRate: number,
  ips: string[],
) =>
  rpc("api_admin_guardar_limites", {
    p_id: id,
    p_rate_sandbox: sandboxRate,
    p_rate_produccion: productionRate,
    p_ips: ips,
  });

// --- Catalogo de endpoints --------------------------------------------------------

type EndpointRow = {
  id: string;
  nombre: string;
  path: string;
  metodo: HttpMethod;
  descripcion: string | null;
  grupo: EndpointGroup;
  estado: string;
  rec: boolean;
  created_at: string;
  updated_at: string;
};

const ENDPOINT_COLUMNS =
  "id, nombre, path, metodo, descripcion, grupo, estado, rec, created_at, updated_at";

export const toApiEndpoint = (r: EndpointRow): ApiEndpoint => ({
  id: r.id,
  name: r.nombre,
  path: r.path,
  method: r.metodo,
  description: r.descripcion,
  group: r.grupo,
  status: parseEnumMap(r.estado, ENDPOINT_STATUS, "api_endpoints.estado"),
  rec: r.rec,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toEndpointRow = (input: ApiEndpointInput) => ({
  nombre: input.name.trim(),
  path: input.path.trim(),
  metodo: input.method,
  descripcion: input.description?.trim() || null,
  grupo: input.group,
  estado: DB_ENDPOINT_STATUS[input.status],
  rec: input.rec,
});

export async function listEndpoints(
  f: ApiEndpointFilters,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ApiEndpointPage> {
  const from = f.page * f.pageSize;
  let q = requireSupabase().from("api_endpoints").select(ENDPOINT_COLUMNS, { count: "exact" });
  if (f.search?.trim()) {
    const s = escapeLike(f.search);
    q = q.or(`nombre.ilike.%${s}%,path.ilike.%${s}%,descripcion.ilike.%${s}%`);
  }
  if (f.status) q = q.eq("estado", DB_ENDPOINT_STATUS[f.status]);
  if (f.group) q = q.eq("grupo", f.group);
  if (f.method) q = q.eq("metodo", f.method);
  let ordered = q
    .order("grupo", { ascending: true })
    .order("nombre", { ascending: true })
    .range(from, from + f.pageSize - 1);
  if (signal) ordered = ordered.abortSignal(signal);
  const { data, error, count } = await ordered;
  if (error) throw toAppError(error, { feature: "external-apis", operation: "endpoints" });
  const rows = ((data ?? []) as EndpointRow[]).map(toApiEndpoint);
  return { rows, total: count ?? rows.length };
}

/** Path + metodo son unicos: el duplicado se marca en el campo path. */
function endpointWriteError(error: unknown, operation: string): AppError {
  const appError = toAppError(error, { feature: "external-apis", operation });
  if (appError.kind !== "conflict") return appError;
  return new AppError("conflict", "Ya existe un endpoint con ese path y método.", {
    field: "path",
    context: appError.context,
    cause: error,
  });
}

export async function createEndpoint(input: ApiEndpointInput): Promise<void> {
  const { error } = await requireSupabase().from("api_endpoints").insert(toEndpointRow(input));
  if (error) throw endpointWriteError(error, "create_endpoint");
}

export async function updateEndpoint(id: string, input: ApiEndpointInput): Promise<void> {
  const { error } = await requireSupabase()
    .from("api_endpoints")
    .update(toEndpointRow(input))
    .eq("id", id);
  if (error) throw endpointWriteError(error, "update_endpoint");
}

export async function setEndpointStatus(id: string, status: EndpointStatus): Promise<void> {
  const { error } = await requireSupabase()
    .from("api_endpoints")
    .update({ estado: DB_ENDPOINT_STATUS[status] })
    .eq("id", id);
  if (error) throw toAppError(error, { feature: "external-apis", operation: "endpoint_status" });
}

export async function deleteEndpoint(id: string): Promise<void> {
  const { error } = await requireSupabase().from("api_endpoints").delete().eq("id", id);
  if (error) throw toAppError(error, { feature: "external-apis", operation: "delete_endpoint" });
}
