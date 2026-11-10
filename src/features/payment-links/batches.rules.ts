import { round2 } from "@/shared/lib/money-round";
import { getRouteApi } from "@tanstack/react-router";
import { z } from "zod";
import { type BatchCredit, type StatusBatch } from "@/infrastructure/supabase/legacy/types";
import { type StatusMostrado } from "./batches.types";

export const route = getRouteApi("/admin/comercios/link-pago/lotes");

/**
 * Deep links desde las otras pantallas del modulo:
 *   ?lote=<uuid>         abre el detalle del lote
 *   ?importacion=<uuid>  (informativo) lotes de una importacion
 */
export const searchSchema = z.object({
  lote: z.string().optional(),
  importacion: z.string().optional(),
});

export const PAGE_SIZES = [10, 20, 50];

export function tone(e: StatusBatch | StatusMostrado): "success" | "warn" | "danger" | "neutral" {
  if (e === "Acreditado") return "success";
  if (e === "Contracargo") return "danger";
  if (e === "Pendiente") return "warn";
  if (e === "Adelantado") return "warn";
  if (e === "Cancelado") return "neutral";
  return "neutral"; // Programado
}

export function statusMostrado(l: BatchCredit): StatusMostrado {
  // Acreditado gana: un contracargo posterior se ve en su propia sección.
  if (l.estado === "Acreditado") return "Acreditado";
  if (l.estado === "Contracargo" || l.esNegativo || l.contracargos > 0) return "Contracargo";
  if (l.estado === "Pendiente" && l.compensacionAdelantos > 0) return "Adelantado";
  return l.estado;
}

export const SUBESTADO_TXT: Record<string, string> = {
  listo: "Listo para acreditar",
  negativo: "Negativo",
  no_conciliado: "No conciliado",
  sin_tasa: "Sin tasa configurada",
  sin_calcular: "Sin calcular",
  comercio_inactivo: "Comercio inactivo",
};

/** ¿El lote viene del archivo de Payway (liquidacion real) o es una proyeccion? */
export function esDelFile(l: BatchCredit) {
  return l.origen === "archivo";
}

/** Neto a acreditar: el calculado en la base para los lotes del archivo; la proyeccion en los Programado. */
export function netBatch(l: BatchCredit) {
  return esDelFile(l) ? Number(l.netoAcreditar ?? l.importeNeto) : l.importeNeto;
}

/**
 * Tone para el estado de un movimiento (link de pago, no lote).
 *
 * Mapea por `estadoCodigo` cuando está presente (códigos del catálogo
 * `estados_movimiento`); si el código es desconocido cae a `warn` para
 * que el operador note que hay un estado que no está en la lista y lo
 * revise, en vez de mostrarlo silenciosamente como neutral.
 */
export function statusMovementTone(
  code: string | null | undefined,
): "success" | "warn" | "danger" | "neutral" {
  if (!code) return "neutral";
  const c = code.toUpperCase();
  if (
    c === "APROBADO" ||
    c === "ACREDITADO" ||
    c === "COMPLETADO" ||
    c === "CONTRACARGO_GANADO"
  )
    return "success";
  if (c === "RECHAZADO" || c === "CANCELADO" || c === "DEVUELTO" || c === "CONTRACARGO")
    return "danger";
  if (c === "PENDIENTE" || c === "EN_PROGRESO" || c === "EN_REVISION" || c === "REQUIERE_ACCION")
    return "warn";
  return "warn";
}

export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function fmtDateCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * ¿El lote está todavía en etapa de proyección?
 *
 * En `Programado` los importes son estimaciones y la comisión por
 * cierre de lote (0,45%) NO se descuenta hasta que se aplica la
 * liquidación de Payway. A partir de `Pendiente` (con el snapshot
 * real del CSV ya grabado) y `Acreditado`, todos los importes son
 * firmes y la 0,45% ya fue debitada.
 */
export function esBatchEstimated(l: BatchCredit): boolean {
  return l.estado === "Programado";
}

/**
 * Tasas (en pesos) que la UI muestra en el desglose del lote.
 *
 * NO se leen de las columnas `tasa_payway_monto` / `tasa_molipay_monto`
 * de la DB: esos valores vienen mal acumulados del job que arma los
 * lotes (no son el resultado correcto de `bruto × pct / 100`). Para
 * no mentir en pantalla, los recalculamos acá a partir del bruto y
 * el porcentaje, que es lo que la regla de negocio manda.
 *
 * En el snapshot del CSV (estado Pendiente) las columnas se
 * sobreescriben con el cálculo del modal de acreditación, así que
 * después de aplicar la liquidación estos números siguen siendo
 * válidos como auditoría: importes_bruto × pct / 100.
 */
export function ratesCalculadas(l: BatchCredit): {
  paywayMonto: number;
  molipayMonto: number;
} {
  const paywayPct = Number(l.tasaPaywayPct) || 0;
  const molipayPct = Number(l.tasaMolipayPct) || 0;
  const gross = Number(l.importeBruto) || 0;
  return {
    paywayMonto: round2((gross * paywayPct) / 100),
    molipayMonto: round2((gross * molipayPct) / 100),
  };
}

/**
 * Suma de descuentos que se muestra al operador.
 *
 * Reglas:
 *  - Las tasas PayWay / MoliPay se calculan acá como `bruto × pct / 100`,
 *    NO se leen de las columnas `tasa_payway_monto` / `tasa_molipay_monto`
 *    de la DB: esos valores vienen mal acumulados del job de armado
 *    de lotes y romperían el total. Las columnas quedan como auditoría.
 *  - En `Programado` el 0,45% no se debita todavía, así que se excluye
 *    del total mostrado. En `Pendiente`/`Acreditado`/`Contracargo` se
 *    incluye como cualquier otro descuento firme.
 */
export function totalDescuentos(l: BatchCredit): number {
  // Lote del archivo: impuestos y tasa de Payway (CSV) + tasa MoliPay (+ IVA
  // si esta configurado) + cierre de lote (lo calcula la base). Las
  // compensaciones de adelantos y deudas se muestran aparte.
  // Mismo total que el detalle: sin compensaciones (ver totalCompensaciones).
  if (esDelFile(l)) {
    return round2(
      Number(l.costoServicioPayway ?? 0) +
        Number(l.impuestosPayway ?? 0) +
        Number(l.tasaMolipayMonto ?? 0) +
        Number(l.ivaTasaMonto ?? 0) +
        Number(l.comisionCierreLoteMonto ?? 0) +
        Number(l.impuestos ?? 0),
    );
  }
  // Proyeccion del flujo nuevo: el neto estimado ya descuenta Payway, tasa,
  // IVA y cierre (trigger lote_proyeccion_neto), igual que el detalle.
  if (!l.legacy && l.estado === "Programado") {
    return round2(Number(l.importeBruto ?? 0) - Number(l.importeNeto ?? 0));
  }
  const closing = esBatchEstimated(l) ? 0 : (l.comisionCierreLoteMonto ?? 0);
  const rates = ratesCalculadas(l);
  // Si los 3 snapshots están en 0 y el legacy > 0, usamos el legacy
  // (lotes viejos acreditados con la fórmula hardcoded). Si no, usamos
  // la suma de los snapshots reales del motor de retenciones.
  const totalReal = (l.ivaMonto ?? 0) + (l.debitoCreditoMonto ?? 0) + (l.iibbMonto ?? 0);
  const usarLegacy = totalReal === 0 && (l.impuestos ?? 0) > 0;
  const taxes = usarLegacy ? (l.impuestos ?? 0) : totalReal;
  return (
    taxes +
    rates.paywayMonto +
    rates.molipayMonto +
    (l.costoPaywayPagoUnico ?? 0) +
    closing +
    (l.contracargoMonto ?? 0)
  );
}

/**
 * Lo que el lote de archivo descuenta aparte de los descuentos: contracargos
 * retenidos, adelantos compensados y deudas recuperadas. Bruto - descuentos -
 * compensaciones = neto a acreditar.
 */
export function totalCompensaciones(l: BatchCredit): number {
  if (!esDelFile(l)) return 0;
  return round2(
    Number(l.retencionContracargos ?? 0) +
      Number(l.compensacionAdelantos ?? 0) +
      Number(l.recuperacionDeuda ?? 0),
  );
}

/** Renglon de Debitos y Creditos en el detalle de impuestos de un lote. */
export const esDyc = (item: { codigo?: string | null }) =>
  ["DEBITOS_CREDITOS", "DC"].includes((item.codigo ?? "").toUpperCase());
