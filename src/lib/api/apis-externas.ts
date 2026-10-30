import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

/**
 * APIs externas para comercios (migracion 20261031100000). Todo pasa por RPCs
 * del backoffice: las tablas no se leen ni escriben directo.
 */

export type EstadoIntegracion =
  | "Pendiente_Validacion"
  | "Homologacion"
  | "Pendiente_Pase_Produccion"
  | "Produccion"
  | "Suspendido"
  | "Revocado";

export type AmbienteApi = "Homologacion" | "Produccion";

export const ESTADO_INTEGRACION_LABEL: Record<EstadoIntegracion, string> = {
  Pendiente_Validacion: "Pendiente de validación",
  Homologacion: "Sandbox",
  Pendiente_Pase_Produccion: "Pase a producción pendiente",
  Produccion: "Producción",
  Suspendido: "Suspendida",
  Revocado: "Revocada",
};

export function tonoEstadoIntegracion(e: EstadoIntegracion): "success" | "neutral" | "warn" | "danger" {
  if (e === "Produccion") return "success";
  if (e === "Suspendido" || e === "Revocado") return "danger";
  if (e === "Pendiente_Pase_Produccion" || e === "Pendiente_Validacion") return "warn";
  return "neutral";
}

export const AMBIENTE_LABEL: Record<AmbienteApi, string> = { Homologacion: "Sandbox", Produccion: "Producción" };

export type IntegracionFila = {
  id: string;
  comercio_id: string;
  comercio: string;
  legajo: string;
  estado: EstadoIntegracion;
  pase_solicitado_at: string | null;
  pase_notas: string | null;
  motivo_suspension: string | null;
  rate_limit_sandbox: number;
  rate_limit_produccion: number;
  ips: number;
  llaves: { ambiente: AmbienteApi; api_key: string; ultimo_uso_at: string | null }[];
  requests_24h: number;
  errores_24h: number;
  ultimo_uso_at: string | null;
  webhooks_fallidos: number;
  created_at: string;
  updated_at: string;
};

export type PermisoFila = {
  endpoint_id: string;
  path: string;
  metodo: string;
  nombre: string;
  categoria: string | null;
  estado: string;
  ambientes: AmbienteApi[];
  default_produccion: boolean;
  sandbox: boolean | null;
  produccion: boolean | null;
};

export type ApiLog = {
  ambiente: AmbienteApi | null;
  metodo: string;
  ruta: string;
  status: number;
  latencia_ms: number | null;
  ip: string | null;
  codigo_error: string | null;
  request_id: string | null;
  created_at: string;
};

export type EntregaWebhook = {
  id: string;
  ambiente: AmbienteApi;
  evento: string;
  estado: "Pendiente" | "Enviando" | "Exitoso" | "Reintentando" | "Fallido";
  intento: number;
  http: number | null;
  error: string | null;
  es_prueba: boolean;
  proximo_reintento: string | null;
  created_at: string;
};

export type DetalleIntegracion = {
  integracion: IntegracionFila & {
    ip_whitelist: string[];
    estado_previo: string | null;
    aprobado_at: string | null;
    suspendido_at: string | null;
    motivo_revocacion: string | null;
    historial: { fecha: string; de: string | null; a: string; por: string | null; nota: string | null }[];
  };
  llaves: {
    id: string;
    ambiente: AmbienteApi;
    api_key: string;
    estado: "Activa" | "Revocada";
    secret_ultimos4: string;
    created_at: string;
    ultimo_uso_at: string | null;
    revocada_at: string | null;
    revocada_motivo: string | null;
  }[];
  permisos: PermisoFila[];
  webhooks: { id: string; ambiente: AmbienteApi; url_callback: string; eventos_suscritos: string[]; activo: boolean; updated_at: string }[];
  logs: ApiLog[];
  entregas: EntregaWebhook[];
};

export const QK_APIS = ["apis-externas"] as const;

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, args);
  if (error) throw new DataAccessError(error);
  return data as T;
}

export const listarIntegraciones = () => rpc<IntegracionFila[]>("api_admin_listar");
export const detalleIntegracion = (id: string) => rpc<DetalleIntegracion>("api_admin_detalle", { p_id: id });
export const aprobarPase = (id: string, nota?: string) => rpc("api_admin_aprobar_pase", { p_id: id, p_nota: nota ?? null });
export const rechazarPase = (id: string, motivo: string) => rpc("api_admin_rechazar_pase", { p_id: id, p_motivo: motivo });
export const suspenderIntegracion = (id: string, motivo: string) => rpc("api_admin_suspender", { p_id: id, p_motivo: motivo });
export const reactivarIntegracion = (id: string, nota?: string) => rpc("api_admin_reactivar", { p_id: id, p_nota: nota ?? null });
export const revocarIntegracion = (id: string, motivo: string) => rpc("api_admin_revocar", { p_id: id, p_motivo: motivo });
export const revocarLlave = (keyId: string, motivo: string) => rpc("api_admin_revocar_llave", { p_key_id: keyId, p_motivo: motivo });
export const guardarPermisos = (id: string, ambiente: AmbienteApi, permisos: { endpoint_id: string; permitido: boolean }[]) =>
  rpc<number>("api_admin_guardar_permisos", { p_id: id, p_ambiente: ambiente, p_permisos: permisos });
export const guardarLimites = (id: string, rateSandbox: number, rateProduccion: number, ips: string[]) =>
  rpc("api_admin_guardar_limites", { p_id: id, p_rate_sandbox: rateSandbox, p_rate_produccion: rateProduccion, p_ips: ips });
export const reintentarWebhook = (logId: string) => rpc("api_admin_reintentar_webhook", { p_log_id: logId });

export function fechaHoraCorta(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
}
