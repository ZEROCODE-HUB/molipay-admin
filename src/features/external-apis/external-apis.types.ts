/*
 * APIs externas para comercios (migracion 20261031100000): integraciones, llaves,
 * permisos por endpoint, webhooks y catalogo de endpoints.
 */

export type IntegrationStatus =
  | "pending_validation"
  | "sandbox"
  | "pending_production"
  | "production"
  | "suspended"
  | "revoked";

export type ApiEnvironment = "sandbox" | "production";

export type ApiKeySummary = {
  environment: ApiEnvironment;
  apiKey: string;
  lastUsedAt: string | null;
};

/** Fila del listado de integraciones. */
export type ApiIntegration = {
  id: string;
  merchantId: string;
  merchantName: string;
  legajo: string;
  status: IntegrationStatus;
  productionRequestedAt: string | null;
  productionRequestNotes: string | null;
  suspensionReason: string | null;
  sandboxRateLimit: number;
  productionRateLimit: number;
  ipCount: number;
  keys: ApiKeySummary[];
  requests24h: number;
  errors24h: number;
  lastUsedAt: string | null;
  failedWebhooks: number;
  createdAt: string;
  updatedAt: string;
};

export type EndpointPermission = {
  endpointId: string;
  path: string;
  method: string;
  name: string;
  category: string | null;
  status: string;
  environments: ApiEnvironment[];
  enabledByDefaultInProduction: boolean;
  /** null = sin regla propia (usa el default). */
  sandbox: boolean | null;
  production: boolean | null;
};

export type ApiRequestLog = {
  environment: ApiEnvironment | null;
  method: string;
  path: string;
  status: number;
  latencyMs: number | null;
  ip: string | null;
  errorCode: string | null;
  requestId: string | null;
  createdAt: string;
};

export type WebhookDeliveryStatus = "pending" | "sending" | "succeeded" | "retrying" | "failed";

export type WebhookDelivery = {
  id: string;
  environment: ApiEnvironment;
  event: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  httpStatus: number | null;
  error: string | null;
  isTest: boolean;
  nextRetryAt: string | null;
  createdAt: string;
};

export type ApiKey = {
  id: string;
  environment: ApiEnvironment;
  apiKey: string;
  active: boolean;
  secretLast4: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
};

export type Webhook = {
  id: string;
  environment: ApiEnvironment;
  callbackUrl: string;
  events: string[];
  active: boolean;
  updatedAt: string;
};

/** Cambio de estado. `from`/`to` quedan como texto: el historial puede traer estados viejos. */
export type StatusChange = {
  at: string;
  from: string | null;
  to: string;
  by: string | null;
  note: string | null;
};

export type IntegrationDetail = {
  integration: ApiIntegration & {
    ipWhitelist: string[];
    previousStatus: string | null;
    approvedAt: string | null;
    suspendedAt: string | null;
    revocationReason: string | null;
    history: StatusChange[];
  };
  keys: ApiKey[];
  permissions: EndpointPermission[];
  webhooks: Webhook[];
  logs: ApiRequestLog[];
  deliveries: WebhookDelivery[];
};

export type ReasonAction = "suspend" | "revoke" | "reject";

// --- Catalogo de endpoints (tabla api_endpoints) ---------------------------

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Grupos del catalogo: son valores de la base que tambien se muestran tal cual. */
export const ENDPOINT_GROUPS = [
  "Autenticación",
  "Enlaces de pago",
  "QR",
  "SubAccounts",
  "Transfer",
  "User",
  "Webhooks",
  "Cobros",
  "Consultas",
  "Contracargos",
  "Transferencias",
] as const;
export type EndpointGroup = (typeof ENDPOINT_GROUPS)[number];

export const ENDPOINT_STATUSES = ["enabled", "disabled"] as const;
export type EndpointStatus = (typeof ENDPOINT_STATUSES)[number];

export type ApiEndpoint = {
  id: string;
  name: string;
  path: string;
  method: HttpMethod;
  description: string | null;
  group: EndpointGroup;
  status: EndpointStatus;
  /** Columna `rec` de api_endpoints (se muestra como "REC"). */
  rec: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiEndpointInput = Omit<ApiEndpoint, "id" | "createdAt" | "updatedAt">;

export type ApiEndpointFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: EndpointStatus;
  group?: EndpointGroup;
  method?: HttpMethod;
};

export type ApiEndpointPage = { rows: ApiEndpoint[]; total: number };
