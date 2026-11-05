import { z } from "zod";
import { type StatusAdvance } from "@/infrastructure/supabase/legacy/types";

/**
 * Deep link desde el calendario de acreditaciones:
 *   ?comercio=<uuid>  → filtra el listado al comercio (se mantiene hasta
 *                        que el operador lo limpie con "Limpiar")
 *   ?adelanto=<uuid>  → abre el modal del ticket apenas carga la fila
 */
export const searchSchema = z.object({
  comercio: z.string().optional(),
  adelanto: z.string().optional(),
});

export function tone(e: StatusAdvance): "warn" | "success" | "danger" | "neutral" {
  if (e === "Pendiente") return "warn";
  if (e === "Aprobado") return "neutral";
  if (e === "Aceptado") return "warn";
  if (e === "Acreditado") return "success";
  if (e === "Compensado") return "success";
  if (e === "Cancelado") return "neutral";
  return "danger";
}

/** Nombre que ve el operador: Pendiente = Solicitado, Aprobado = Ofertado. */
export function label(e: StatusAdvance): string {
  if (e === "Pendiente") return "Solicitado";
  if (e === "Aprobado") return "Ofertado";
  return e;
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
