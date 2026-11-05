import { type SaleDay } from "@/features/payment-links/credits.supabase";

export const PAGE_SIZES = [10, 20, 50];

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Estado del lote de venta: Abierto (dia en curso, antes del corte) o
 * Cerrado (lote finalizado y enviado a Payway).
 */
export function statusBatch(r: SaleDay): "Abierto" | "Cerrado" {
  return r.estado === "Abierto" ? "Abierto" : "Cerrado";
}
