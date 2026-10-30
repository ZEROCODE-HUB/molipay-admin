import { establecimientoDeLote, ventasDeLote } from "@/lib/api/acreditaciones";
import type { CsvGenerado } from "./generar-csv-contracargo-real";

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

export type LoteParaSimular = { id: string; codigo: string; bandera: string };

export type OpcionesSimulacion = {
  /** Ventas por lote a disputar (las primeras del lote). */
  ventasPorLote: number;
  /** "total": el contracargo es el monto de la venta; "parcial": la mitad. */
  modo: "total" | "parcial";
  /** Generar tambien el CSV de liquidacion con el renglon negativo. */
  conLiquidacion: boolean;
};

export type SimulacionGenerada = {
  reporte: CsvGenerado;
  liquidacion: CsvGenerado | null;
  ventas: number;
  sinTid: number;
  lotesSinEstablecimiento: string[];
};

const MOTIVOS: { origen: string; motivo: string }[] = [
  { origen: "EMISOR", motivo: "Desconocimiento de compra" },
  { origen: "EMISOR", motivo: "Producto no recibido" },
  { origen: "EMISOR", motivo: "Monto no reconocido" },
  { origen: "ADQUIRENTE", motivo: "Duplicado de cobro" },
  { origen: "EMISOR", motivo: "Servicio no prestado" },
  { origen: "EMISOR", motivo: "Fraude con tarjeta" },
];

function campo(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function linea(campos: string[]): string {
  return campos.map(campo).join(";");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Importe con coma decimal, como el archivo de Payway. */
function importe(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddmmyyyy(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export async function generarSimulacionContracargos(
  lotes: LoteParaSimular[],
  opciones: OpcionesSimulacion,
): Promise<SimulacionGenerada> {
  if (lotes.length === 0) throw new Error("Elegí al menos un lote.");

  const filas: string[] = [];
  const negativos = new Map<string, { marca: string; establecimiento: string; monto: number }>();
  const lotesSinEstablecimiento: string[] = [];
  let sinTid = 0;
  let i = 0;

  for (const lote of lotes) {
    const [ventas, est] = await Promise.all([ventasDeLote(lote.id), establecimientoDeLote(lote.id).catch(() => null)]);
    const establecimiento = est?.establecimiento?.trim() || "";
    if (!establecimiento) lotesSinEstablecimiento.push(lote.codigo);

    const conTid = ventas.filter((v) => !!v.site_transaction_id);
    sinTid += ventas.length - conTid.length;

    for (const v of conTid.slice(0, Math.max(1, opciones.ventasPorLote))) {
      const m = MOTIVOS[i % MOTIVOS.length]!;
      const tid = v.site_transaction_id!;
      const monto = round2(opciones.modo === "parcial" ? Number(v.monto_operacion) / 2 : Number(v.monto_operacion));
      const marca = v.bandera ?? lote.bandera;
      // Ultimos 4 y autorizacion derivados del TID: estables entre descargas.
      const ult4 = String(parseInt(tid.replace(/[^0-9a-z]/gi, "").slice(-4) || "0", 36) % 10000).padStart(4, "0");
      const aut = tid.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase().padStart(6, "0");
      filas.push(
        linea([tid, establecimiento, ddmmyyyy(v.fecha), marca, `****${ult4}`, importe(monto), aut, m.origen, m.motivo]),
      );
      const k = `${marca}|${establecimiento}`;
      const prev = negativos.get(k);
      negativos.set(k, { marca, establecimiento, monto: round2((prev?.monto ?? 0) + monto) });
      i++;
    }
  }

  if (filas.length === 0) {
    throw new Error(
      sinTid > 0
        ? "Las ventas de esos lotes no tienen site_transaction_id: el importador no podría encontrarlas."
        : "Los lotes elegidos no tienen ventas vinculadas.",
    );
  }

  const hoy = hoyIso();
  const reporte = [
    `Payway - Reporte de Contracargos y Devoluciones (simulacion) ${ddmmyyyy(hoy)}`,
    linea([
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
    ...filas,
  ];

  let liquidacion: CsvGenerado | null = null;
  if (opciones.conLiquidacion) {
    const renglones = [...negativos.values()].map((n) =>
      [hoy, n.marca.toUpperCase(), n.establecimiento || "00000000", importe(-n.monto), importe(0), importe(0), importe(-n.monto)].join(";"),
    );
    liquidacion = {
      csv:
        "﻿" +
        [
          `Detalle de Liquidaciones de Payway Test - Contracargos - Liquidacion ${hoy}`,
          "FECHA;MARCA;ESTABLECIMIENTO;TOTAL_BRUTO;COSTO_DE_SERVICIO;IMPUESTOS;TOTAL_NETO",
          ...renglones,
        ].join("\r\n") +
        "\r\n",
      filename: `liquidacion_contracargos_${hoy}.csv`,
      filas: renglones.length,
      pagosUsados: filas.length,
    };
  }

  return {
    reporte: {
      csv: "﻿" + reporte.join("\r\n") + "\r\n",
      filename: `contracargos_simulacion_${hoy}.csv`,
      filas: filas.length,
      pagosUsados: filas.length,
    },
    liquidacion,
    ventas: filas.length,
    sinTid,
    lotesSinEstablecimiento,
  };
}
