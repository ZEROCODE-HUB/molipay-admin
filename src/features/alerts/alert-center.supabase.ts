import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";

/**
 * Centro de alertas del backoffice (RPC `alertas_centro`): junta lo que cada
 * modulo ya registra y requiere accion (monitoreo, bloqueos, contracargos,
 * deudas, conciliacion, acreditaciones, adelantos, impuestos, BCRA). Lo leido
 * se guarda por administrador de la sesion.
 */

export type SeverityAlert = "critica" | "advertencia" | "info";

export type AlertCentro = {
  clave: string;
  severidad: SeverityAlert;
  tipo: string;
  titulo: string;
  detalle: string;
  fecha: string | null;
  link: string;
  accion: string;
  leida: boolean;
};

export type CentroAlerts = {
  resumen: {
    total: number;
    no_leidas: number;
    critica: number;
    advertencia: number;
    info: number;
    criticas_no_leidas: number;
  };
  alertas: AlertCentro[];
};

export const QK_ALERTS_CENTRO = ["alertas-centro"] as const;

export async function getCentroAlerts(limit = 10): Promise<CentroAlerts> {
  const { data, error } = await requireSupabase().rpc("alertas_centro", { p_limite: limit });
  if (error) throw toAppError(error);
  return data as CentroAlerts;
}

export async function markAlertsLeidas(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const { data, error } = await requireSupabase().rpc("alertas_centro_marcar", { p_claves: keys });
  if (error) throw toAppError(error);
  return Number(data ?? 0);
}

export const KIND_ALERT_LABEL: Record<string, string> = {
  compliance: "Monitoreo",
  bloqueo: "Bloqueos",
  contracargo: "Contracargos",
  deuda: "Saldo negativo",
  conciliacion: "Conciliación",
  acreditacion: "Acreditaciones",
  liquidacion: "Liquidaciones",
  adelanto: "Adelantos",
  impuestos: "Impuestos",
  bcra: "BCRA",
  api: "API externa",
};

export const SEVERITY_LABEL: Record<SeverityAlert, string> = {
  critica: "Crítica",
  advertencia: "Advertencia",
  info: "Informativa",
};

/** "hace 5 min", "hace 3 h", "hace 2 d" o la fecha. */
export function haceCuanto(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return new Date(iso).toLocaleDateString("es-AR");
  const min = Math.floor(ms / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-AR");
}
