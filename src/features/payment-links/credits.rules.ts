import { getRouteApi } from "@tanstack/react-router";
import { z } from "zod";
import { type BatchV2,type DayCredit } from "@/features/payment-links/credits.supabase";
import { type RowMerchant } from "./credits.types";

export const route = getRouteApi("/admin/comercios/link-pago/acreditaciones");

export const searchSchema = z.object({
  fecha: z.string().optional(),
  comercio: z.string().optional(),
});

export const TONE_DAY: Record<DayCredit["estado"], "success" | "warn" | "danger" | "neutral"> = {
  Acreditado: "success",
  "Acreditado parcial": "success",
  Listo: "neutral",
  "No conciliado": "warn",
  "Con excepciones": "danger",
};

export function agruparByMerchant(batches: BatchV2[]): RowMerchant[] {
  const m = new Map<string, RowMerchant>();
  for (const l of batches) {
    const g =
      m.get(l.comercio_id) ??
      ({
        comercio_id: l.comercio_id,
        comercio: l.comercio_nombre ?? l.comercio_usuario,
        legajo: l.comercio_legajo,
        lotes: 0,
        bruto: 0,
        neto_payway: 0,
        descuentos: 0,
        compensaciones: 0,
        neto_a_acreditar: 0,
        acreditado: 0,
        elegibles: [],
        estado: "Acreditado",
      } as RowMerchant);
    g.lotes++;
    g.bruto += Number(l.importe_bruto);
    g.neto_payway += Number(l.neto_payway ?? 0);
    g.descuentos +=
      Number(l.tasa_molipay_monto ?? 0) +
      Number(l.iva_tasa_monto ?? 0) +
      Number(l.comision_cierre_lote_monto ?? 0) +
      Number(l.impuestos ?? 0);
    g.compensaciones +=
      Number(l.retencion_contracargos ?? 0) +
      Number(l.compensacion_adelantos) +
      Number(l.recuperacion_deuda);
    g.neto_a_acreditar += Number(l.neto_a_acreditar ?? 0);
    if (l.estado === "Acreditado") g.acreditado += Number(l.neto_a_acreditar ?? 0);
    if (l.elegible) g.elegibles.push(l.id);
    if (l.estado !== "Acreditado")
      g.estado =
        l.subestado === "no_conciliado"
          ? "No conciliado"
          : g.estado === "No conciliado"
            ? g.estado
            : "Pendiente";
    m.set(l.comercio_id, g);
  }
  return [...m.values()];
}
