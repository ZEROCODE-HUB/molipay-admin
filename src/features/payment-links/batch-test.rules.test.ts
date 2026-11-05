import { describe, expect, it } from "vitest";
import type { BatchProjection } from "@/features/payment-links/batches.supabase";
import type { CalculoBatch } from "@/features/payment-links/credits.supabase";
import { verifyProjection, verifySettlement } from "./batch-test.rules";

const settlement = {
  bruto: 1050,
  neto_payway: 985.95,
  tasa_pct: 4,
  tasa_monto: 42,
  iva_pct: 21,
  iva_tasa_monto: 8.82,
  cierre_pct: 0.45,
  cierre_monto: 4.73,
  impuestos_monto: 0,
  compensacion_adelantos: 0,
  recuperacion_deuda: 0,
  neto_a_acreditar: 930.4,
} as CalculoBatch;

const projection: BatchProjection = {
  bruto: 1050,
  paywayPct: 3,
  paywayMonto: 31.5,
  impuestosPct: 2,
  impuestosMonto: 21,
  netoPayway: 997.5,
  tasaPct: 4,
  tasaMonto: 42,
  ivaPct: 21,
  ivaMonto: 8.82,
  cierrePct: 0.45,
  cierreMonto: 4.73,
  usaIibb: false,
  iibb: null,
  usaDyc: false,
  dyc: null,
  compensacionAdelantos: 0,
  netoFinal: 941.95,
};

describe("verifySettlement", () => {
  it("accepts the business example", () => {
    expect(verifySettlement(settlement)).toEqual([]);
  });

  it("reports a rate calculated on the wrong base", () => {
    const wrong = { ...settlement, tasa_monto: 39.44 };
    expect(verifySettlement(wrong).map((m) => m.concepto)).toEqual(["Tasa MoliPay"]);
  });

  it("includes advances and taxes in the final amount", () => {
    const withAdvance = {
      ...settlement,
      impuestos_monto: 26.25,
      compensacion_adelantos: 200,
      neto_a_acreditar: 704.15,
    };
    expect(verifySettlement(withAdvance)).toEqual([]);
  });
});

describe("verifyProjection", () => {
  it("accepts the estimate with the 2% taxes", () => {
    expect(verifyProjection(projection)).toEqual([]);
  });

  it("subtracts the IIBB withholding when the lot uses it", () => {
    const withIibb = {
      ...projection,
      usaIibb: true,
      iibb: { alicuota: 2.5, monto: 26.25, nota: null },
      netoFinal: 915.7,
    };
    expect(verifyProjection(withIibb)).toEqual([]);
  });

  it("subtracts IIBB and Debitos y Creditos together", () => {
    const withBoth = {
      ...projection,
      usaIibb: true,
      iibb: { alicuota: 2.5, monto: 26.25, nota: null },
      usaDyc: true,
      dyc: { alicuota: 0.6, monto: 6.3, nota: null },
      netoFinal: 909.4,
    };
    expect(verifyProjection(withBoth)).toEqual([]);
  });

  it("reports a final estimate that does not add up", () => {
    const wrong = { ...projection, netoFinal: 962.95 };
    expect(verifyProjection(wrong).map((m) => m.concepto)).toEqual(["Estimado final"]);
  });
});
