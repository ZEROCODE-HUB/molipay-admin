import { type StatusContra } from "@/features/payment-links/chargebacks.supabase";

export const STATUS_LABEL: Record<StatusContra, string> = {
  Simulado: "Simulado",
  Abierto: "Abierto",
  En_mediación: "En mediación",
  En_mediacion: "En mediación",
  Cerrado_acreditado: "Cerrado acreditado",
  Cerrado_retenido: "Cerrado retenido",
};

export const STATUS_OPTIONS_UI: StatusContra[] = [
  "Simulado",
  "Abierto",
  "En_mediación",
  "Cerrado_acreditado",
  "Cerrado_retenido",
];

export function tone(e: StatusContra): "warn" | "neutral" | "success" | "danger" {
  if (e === "Simulado") return "neutral";
  if (e === "Abierto") return "warn";
  if (e === "En_mediación" || e === "En_mediacion") return "neutral";
  if (e === "Cerrado_acreditado") return "success";
  return "danger"; // Cerrado_retenido
}

/**
 * Días hábiles entre hoy y `fecha_limite`.
 * - Positivo: días que faltan (en horario hábil, lun-vie)
 * - Negativo: días que se pasó del plazo
 * - 0: vence hoy
 */
export function daysHabilesRestantes(dateLimit: string): number {
  const limit = new Date(dateLimit);
  const today = new Date();
  // Normalizamos a inicio de día para evitar líos de hora.
  const dLimit = new Date(limit.getFullYear(), limit.getMonth(), limit.getDate());
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dLimit.getTime() === dToday.getTime()) return 0;

  const sentido = dLimit.getTime() > dToday.getTime() ? 1 : -1;
  const cursor = new Date(dToday);
  let count = 0;

  while (true) {
    cursor.setDate(cursor.getDate() + sentido);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count += sentido;
    if (sentido > 0 && cursor.getTime() >= dLimit.getTime()) break;
    if (sentido < 0 && cursor.getTime() <= dLimit.getTime()) break;
  }
  return count;
}

/** Paso del stepper: 0 abierto, 1 en mediacion, 2 resuelto. */
export function chargebackStep(e: StatusContra): number {
  if (e === "En_mediación" || e === "En_mediacion") return 1;
  if (e === "Cerrado_acreditado" || e === "Cerrado_retenido") return 2;
  return 0;
}

/** Que paso con la plata del comercio (contracargos.retencion_estado). */
export const RETENTION_LABEL: Record<
  string,
  { label: string; tone: "success" | "warn" | "danger" | "neutral" }
> = {
  pendiente: { label: "Se retiene al acreditar", tone: "warn" },
  retenido: { label: "Retenido al comercio", tone: "danger" },
  aplicado_payway: { label: "Descontado por Payway", tone: "neutral" },
  liberado: { label: "Devuelto al comercio", tone: "success" },
  no_aplica: { label: "Lo descuenta Payway", tone: "neutral" },
};

export const ORIGIN_LABEL: Record<string, string> = {
  reporte: "Reporte de Payway",
  liquidacion: "Archivo diario",
  polling: "Consulta a Payway",
  manual: "Carga manual",
  devolucion: "Devolución",
};
