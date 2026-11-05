import {
ALERT_STATUS_LABEL,
type AlertStatus,
} from "@/features/regulatory-reports/compliance.supabase";

/** Clave de cache compartida: quien cree alertas (simulador, barrido) la invalida. */
export const ALERTS_QUERY_KEY = ["alerts"] as const;

export const PAGE_SIZES = [10, 20, 50];
export const STATUS_OPTIONS = Object.values(ALERT_STATUS_LABEL);
export const STATUS_BY_LABEL = new Map(
  Object.entries(ALERT_STATUS_LABEL).map(([k, v]) => [v, k as AlertStatus]),
);
export const STATUS_TONE: Record<AlertStatus, "warn" | "neutral" | "success" | "danger"> = {
  pending: "warn",
  in_review: "neutral",
  resolved: "success",
  dismissed: "neutral",
};

export const fmtDay = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
export const daysRestantes = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
export const WITHOUT_ASSIGN = "Sin asignar";
