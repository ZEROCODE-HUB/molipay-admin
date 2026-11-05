import { AppError } from "@/shared/lib/errors";
import { establishmentDeBatch,salesDeBatch } from "@/features/payment-links/credits.supabase";
import type { CsvGenerado } from "@/features/payment-links/importers/chargeback-real-csv";

/**
 * CSV de simulacion de contracargos a partir de lotes Programados o
 * Pendientes, con las ventas reales de esos lotes.
 *
 * Genera dos archivos que reproducen lo que manda Payway:
 *   1. El reporte de "Contracargos y Devoluciones" (formato que lee el
 *      importador de contracargos): una fila por venta disputada con su
 *      site_transaction_id, establecimiento, tarjeta, autorizacion,
 *      CCO_ORIGEN y CCO_MOTIVO.
 *   2. Opcional: el archivo de liquidacion con el renglon negativo de esas
 *      mismas ventas (una fila por marca y establecimiento), para probar el
 *      cruce: el contracargo se vincula al lote negativo en vez de cobrarse
 *      dos veces.
 *
 * Las ventas sin site_transaction_id se saltean: el importador no podria
 * encontrarlas.
 */

export type BatchForSimulate = { id: string; codigo: string; bandera: string };

export type OptionsSimulation = {
  /** Ventas por lote a disputar (las primeras del lote). */
  ventasPorLote: number;
  /** "total": el contracargo es el monto de la venta; "parcial": la mitad. */
  modo: "total" | "parcial";
  /** Generar tambien el CSV de liquidacion con el renglon negativo. */
  conLiquidacion: boolean;
};

export type SimulationGenerada = {
  reporte: CsvGenerado;
  liquidacion: CsvGenerado | null;
  ventas: number;
  sinTid: number;
  lotesSinEstablecimiento: string[];
};

const REASONS: { origen: string; motivo: string }[] = [
  { origen: "EMISOR", motivo: "Desconocimiento de compra" },
  { origen: "EMISOR", motivo: "Producto no recibido" },
  { origen: "EMISOR", motivo: "Monto no reconocido" },
  { origen: "ADQUIRENTE", motivo: "Duplicado de cobro" },
  { origen: "EMISOR", motivo: "Servicio no prestado" },
  { origen: "EMISOR", motivo: "Fraude con tarjeta" },
];

function field(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function line(fields: string[]): string {
  return fields.map(field).join(";");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Importe con coma decimal, como el archivo de Payway. */
function amount(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddmmyyyy(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export async function generateSimulationChargebacks(
  batches: BatchForSimulate[],
  options: OptionsSimulation,
): Promise<SimulationGenerada> {
  if (batches.length === 0) throw new AppError("validation", "Elegí al menos un lote.");

  const rows: string[] = [];
  const negativos = new Map<string, { marca: string; establecimiento: string; monto: number }>();
  const batchesWithoutEstablishment: string[] = [];
  let withoutTid = 0;
  let i = 0;

  for (const batch of batches) {
    const [sales, est] = await Promise.all([
      salesDeBatch(batch.id),
      establishmentDeBatch(batch.id).catch(() => null),
    ]);
    const establishment = est?.establecimiento?.trim() || "";
    if (!establishment) batchesWithoutEstablishment.push(batch.codigo);

    const withTid = sales.filter((v) => !!v.site_transaction_id);
    withoutTid += sales.length - withTid.length;

    for (const v of withTid.slice(0, Math.max(1, options.ventasPorLote))) {
      const m = REASONS[i % REASONS.length]!;
      const tid = v.site_transaction_id!;
      const monto = round2(
        options.modo === "parcial" ? Number(v.monto_operacion) / 2 : Number(v.monto_operacion),
      );
      const brand = v.bandera ?? batch.bandera;
      // Ultimos 4 y autorizacion derivados del TID: estables entre descargas.
      const ult4 = String(
        parseInt(tid.replace(/[^0-9a-z]/gi, "").slice(-4) || "0", 36) % 10000,
      ).padStart(4, "0");
      const aut = tid
        .replace(/[^A-Z0-9]/gi, "")
        .slice(-6)
        .toUpperCase()
        .padStart(6, "0");
      rows.push(
        line([
          tid,
          establishment,
          ddmmyyyy(v.fecha),
          brand,
          `****${ult4}`,
          amount(monto),
          aut,
          m.origen,
          m.motivo,
        ]),
      );
      const k = `${brand}|${establishment}`;
      const prev = negativos.get(k);
      negativos.set(k, {
        marca: brand,
        establecimiento: establishment,
        monto: round2((prev?.monto ?? 0) + monto),
      });
      i++;
    }
  }

  if (rows.length === 0) {
    throw new AppError(
      "validation",
      withoutTid > 0
        ? "Las ventas de esos lotes no tienen site_transaction_id: el importador no podría encontrarlas."
        : "Los lotes elegidos no tienen ventas vinculadas.",
    );
  }

  const today = todayIso();
  const report = [
    `Payway - Reporte de Contracargos y Devoluciones (simulacion) ${ddmmyyyy(today)}`,
    line([
      "ID_TRANSACCION",
      "ESTABLECIMIENTO",
      "FECHA_DE_TRANS",
      "MEDIO_DE_PAGO",
      "NRO_DE_TARJETA",
      "MONTO_DE_TRAM",
      "CODIGO_DE_AUT",
      "CCO_ORIGEN",
      "CCO_MOTIVO",
    ]),
    ...rows,
  ];

  let settlement: CsvGenerado | null = null;
  if (options.conLiquidacion) {
    const lines = [...negativos.values()].map((n) =>
      [
        today,
        n.marca.toUpperCase(),
        n.establecimiento || "00000000",
        amount(-n.monto),
        amount(0),
        amount(0),
        amount(-n.monto),
      ].join(";"),
    );
    settlement = {
      csv:
        "﻿" +
        [
          `Detalle de Liquidaciones de Payway Test - Contracargos - Liquidacion ${today}`,
          "FECHA;MARCA;ESTABLECIMIENTO;TOTAL_BRUTO;COSTO_DE_SERVICIO;IMPUESTOS;TOTAL_NETO",
          ...lines,
        ].join("\r\n") +
        "\r\n",
      filename: `liquidacion_contracargos_${today}.csv`,
      filas: lines.length,
      pagosUsados: rows.length,
    };
  }

  return {
    reporte: {
      csv: "﻿" + report.join("\r\n") + "\r\n",
      filename: `contracargos_simulacion_${today}.csv`,
      filas: rows.length,
      pagosUsados: rows.length,
    },
    liquidacion: settlement,
    ventas: rows.length,
    sinTid: withoutTid,
    lotesSinEstablecimiento: batchesWithoutEstablishment,
  };
}
