import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "./errors";

/**
 * Centro de alertas del backoffice (RPC `alertas_centro`): junta lo que cada
 * modulo ya registra y requiere accion (monitoreo, bloqueos, contracargos,
 * deudas, conciliacion, acreditaciones, adelantos, impuestos, BCRA). Lo leido
 * se guarda por administrador de la sesion.
 */

export type SeveridadAlerta = "critica" | "advertencia" | "info";

export type AlertaCentro = {
  clave: string;
  severidad: SeveridadAlerta;
  tipo: string;
  titulo: string;
  detalle: string;
  fecha: string | null;
  link: string;
  accion: string;
  leida: boolean;
};

export type CentroAlertas = {
  resumen: {
    total: number;
    no_leidas: number;
    critica: number;
    advertencia: number;
    info: number;
    criticas_no_leidas: number;
  };
  alertas: AlertaCentro[];
};

export const QK_ALERTAS_CENTRO = ["alertas-centro"] as const;

export async function getCentroAlertas(limite = 10): Promise<CentroAlertas> {
  const { data, error } = await requireSupabase().rpc("alertas_centro", { p_limite: limite });
  if (error) throw new DataAccessError(error);
  return data as CentroAlertas;
}

export async function marcarAlertasLeidas(claves: string[]): Promise<number> {
  if (claves.length === 0) return 0;
  const { data, error } = await requireSupabase().rpc("alertas_centro_marcar", { p_claves: claves });
  if (error) throw new DataAccessError(error);
  return Number(data ?? 0);
}

export const TIPO_ALERTA_LABEL: Record<string, string> = {
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

export const SEVERIDAD_LABEL: Record<SeveridadAlerta, string> = {
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
