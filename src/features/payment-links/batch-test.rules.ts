import type { BatchProjection } from "@/features/payment-links/batches.supabase";
import type { CalculoBatch } from "@/features/payment-links/credits.supabase";

// Control independiente de la prueba de punta a punta: recalcula con la regla de
// negocio lo que devolvio la base. No define importes, solo los compara.

export type CalcMismatch = { concepto: string; esperado: number; obtenido: number };

const TOLERANCE = 0.011;

export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function compare(rows: [string, number, number][]): CalcMismatch[] {
  return rows
    .filter(([, esperado, obtenido]) => Math.abs(esperado - obtenido) > TOLERANCE)
    .map(([concepto, esperado, obtenido]) => ({ concepto, esperado, obtenido }));
}

export function verifyProjection(p: BatchProjection): CalcMismatch[] {
  const arancel = round2((p.bruto * p.paywayPct) / 100);
  const taxes = round2((p.bruto * p.impuestosPct) / 100);
  const neto = round2(p.bruto - arancel - taxes);
  const tasa = round2((p.bruto * p.tasaPct) / 100);
  const iva = round2((tasa * p.ivaPct) / 100);
  const cierre = round2((p.bruto * p.cierrePct) / 100);
  const iibb = p.iibb?.monto ?? 0;
  const dyc = p.dyc?.monto ?? 0;
  return compare([
    ["Arancel Payway", arancel, p.paywayMonto],
    ["Impuestos Payway", taxes, p.impuestosMonto],
    ["Neto Payway", neto, p.netoPayway],
    ["Tasa MoliPay", tasa, p.tasaMonto],
    ["IVA sobre tasa", iva, p.ivaMonto],
    ["Cierre de lote", cierre, p.cierreMonto],
    [
      "Estimado final",
      round2(neto - tasa - iva - cierre - iibb - dyc - p.compensacionAdelantos),
      p.netoFinal,
    ],
  ]);
}

export function verifySettlement(c: CalculoBatch): CalcMismatch[] {
  const tasa = round2((c.bruto * c.tasa_pct) / 100);
  const iva = round2((tasa * c.iva_pct) / 100);
  const cierre = round2((c.bruto * c.cierre_pct) / 100);
  return compare([
    ["Tasa MoliPay", tasa, c.tasa_monto],
    ["IVA sobre tasa", iva, c.iva_tasa_monto],
    ["Cierre de lote", cierre, c.cierre_monto],
    [
      "Importe final",
      round2(
        c.neto_payway -
          tasa -
          iva -
          cierre -
          Number(c.impuestos_monto ?? 0) -
          Number(c.retencion_contracargos ?? 0) -
          Number(c.compensacion_adelantos ?? 0) -
          Number(c.recuperacion_deuda ?? 0),
      ),
      c.neto_a_acreditar,
    ],
  ]);
}
