import { AppError } from "@/shared/lib/errors";
import { toAppError } from "@/infrastructure/supabase/errors";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { downloadText } from "@/shared/lib/download";

/**
 * Genera un CSV de prueba de contracargos para el importador, usando
 * TIDs reales de la base. Sirve para probar el flujo end-to-end del
 * importador sin necesidad de un reporte real de PayWay.
 *
 * Toma los últimos N `site_transaction_id` de `cliente_links_pago_pagos`
 * y arma un CSV con los 5 motivos más comunes de contracargo. Si
 * subís el CSV al importador, debería matchear todos los TIDs.
 *
 * Útil para:
 *   - Dev: validar que el importador matchee correctamente.
 *   - QA: probar el flujo completo de un contracargo (Abierto →
 *     En_mediación → Cerrado_retenido) sin generar cobros reales.
 *
 * Si no hay TIDs en la DB, lanza un error claro.
 */

export type PaymentForCsv = {
  siteTransactionId: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
};

export type CsvGenerado = {
  csv: string;
  filename: string;
  filas: number;
  pagosUsados: number;
};

const REASONS_DEMO: { motivo: string; origen: string; ccoOrigen: string }[] = [
  {
    motivo: "Desconocimiento de compra",
    origen: "WEB",
    ccoOrigen: "DESCONOCIMIENTO",
  },
  {
    motivo: "Producto no recibido",
    origen: "APP",
    ccoOrigen: "PRODUCTO",
  },
  {
    motivo: "Monto no reconocido",
    origen: "WEB",
    ccoOrigen: "MONTO",
  },
  {
    motivo: "Duplicado de cobro",
    origen: "APP",
    ccoOrigen: "DUPLICADO",
  },
  {
    motivo: "Servicio no prestado",
    origen: "WEB",
    ccoOrigen: "SERVICIO",
  },
  {
    motivo: "Cancelación no procesada",
    origen: "APP",
    ccoOrigen: "CANCELACION",
  },
  {
    motivo: "Fraude con tarjeta",
    origen: "WEB",
    ccoOrigen: "FRAUDE",
  },
];

const BRANDS = ["Visa", "Mastercard", "Amex", "Cabal"] as const;

function pad4(n: number): string {
  return `****${String(n).padStart(4, "0")}`;
}

function escapeCsvField(s: string): string {
  // Escapamos ; y " que romperían el CSV
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(";");
}

/**
 * Genera el CSV y lo devuelve como string + filename. No lo descarga:
 * eso lo hace el componente que lo llama.
 */
export async function generateCsvChargebackDemo(quantity = 5): Promise<CsvGenerado> {
  const sb = requireSupabase();

  // Traemos los últimos N pagos con TID
  const { data, error } = await sb
    .from("cliente_links_pago_pagos")
    .select("site_transaction_id, monto, created_at")
    .not("site_transaction_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(quantity);
  if (error) throw toAppError(error);

  const payments = (data ?? []) as Array<{
    site_transaction_id: string;
    monto: number;
    created_at: string;
  }>;

  if (payments.length === 0) {
    throw new AppError(
      "validation",
      "No hay pagos con site_transaction_id en la base. " +
        "El importador necesita TIDs reales para matchear. " +
        "Generá primero un pago de prueba.",
    );
  }

  const date = new Date();
  const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const dateFmt = `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()}`;

  const lines: string[] = [
    // Línea 1: título del reporte (la salta el parser)
    `MoliPay - Reporte de Alertas Tempranas de Contracargos;Periodo ${period};Generado ${date.toLocaleString("es-AR")}`,
    // Línea 2: header real
    buildCsvLine([
      "ID_TRANSACCION",
      "FECHA_DE_TRANS",
      "MEDIO_DE_PAGO",
      "NRO_DE_TARJETA",
      "MONTO_DE_TRAM",
      "CODIGO_DE_AUT",
      "CCO_ORIGEN",
      "CCO_MOTIVO",
    ]),
  ];

  payments.forEach((p, i) => {
    const reason = REASONS_DEMO[i % REASONS_DEMO.length]!;
    const brand = BRANDS[i % BRANDS.length]!;
    // Generamos un "último 4" determinístico a partir del TID.
    // No es el real (que no tenemos en la DB), pero es estable.
    const last4 = parseInt(p.site_transaction_id.slice(-4), 36) % 10000;
    const amount = Number(p.monto);
    // Fecha del pago (la del create_at) en formato DD/MM/YYYY
    const datePayment = p.created_at
      ? p.created_at.slice(0, 10).split("-").reverse().join("/")
      : dateFmt;
    // Codigo de autorizacion PayWay: derivado del TID para que sea
    // estable
    const codAut = `PW-TKT-${p.site_transaction_id
      .replace(/[^A-Z0-9]/gi, "")
      .slice(-6)
      .toUpperCase()}`;

    lines.push(
      buildCsvLine([
        p.site_transaction_id,
        datePayment,
        brand,
        pad4(last4),
        amount.toFixed(2),
        codAut,
        reason.origen,
        reason.motivo,
      ]),
    );
  });

  const csv = "\uFEFF" + lines.join("\r\n");
  return {
    csv,
    filename: `contracargos_reales_${period}.csv`,
    filas: payments.length,
    pagosUsados: payments.length,
  };
}

/**
 * Helper que dispara la descarga del CSV en el navegador.
 */
export function downloadCsv(csvGenerado: CsvGenerado): void {
  downloadText(csvGenerado.filename, csvGenerado.csv, "text/csv;charset=utf-8");
}

/**
 * Reporte de Contracargos de Payway de prueba para un lote: una venta real
 * del lote, elegida al azar, con el formato del reporte detallado
 * (ID_TRANSACC, TIPO_MOVIM = Contracargo, MONTO_TRAM en negativo).
 * Se sube en Contracargos > Importar: la base encuentra la venta por su
 * ID_TRANSACC y retiene el importe en ese mismo lote.
 * La tarjeta y el codigo de operacion son simulados (no estan en la base).
 */
export async function generateChargebackReportForBatch(
  batch: { codigo: string; bandera: string },
  movementIds: string[],
): Promise<CsvGenerado & { siteTransactionId: string; monto: number }> {
  if (movementIds.length === 0) {
    throw new AppError(
      "validation",
      "El lote todavía no tiene ventas: no hay de cuál simular el contracargo.",
    );
  }
  const { data, error } = await requireSupabase()
    .from("transactions")
    .select("id, site_transaction_id, monto_operacion, fecha, bandera")
    .in("id", movementIds)
    .not("site_transaction_id", "is", null);
  if (error) throw toAppError(error);
  const sales = (data ?? []) as {
    id: string;
    site_transaction_id: string;
    monto_operacion: number;
    fecha: string;
    bandera: string | null;
  }[];
  if (sales.length === 0) {
    throw new AppError("validation", "Las ventas del lote no tienen ID de transacción de Payway.");
  }

  const sale = sales[Math.floor(Math.random() * sales.length)]!;
  const reason = REASONS_DEMO[Math.floor(Math.random() * REASONS_DEMO.length)]!;
  const amount = Number(sale.monto_operacion);
  const last4 = parseInt(sale.site_transaction_id.slice(-4), 36) % 10000;
  const today = new Date();
  const p2 = (x: number) => String(x).padStart(2, "0");
  const stamp = `${today.getFullYear()}${p2(today.getMonth() + 1)}${p2(today.getDate())}`;

  const lines = [
    `Reporte de Contracargos y Devoluciones de Payway Test - Lote ${batch.codigo}`,
    buildCsvLine([
      "ID_TRANSACC",
      "FECHA",
      "MEDIO_DE_PAGO",
      "NRO_TARJETA",
      "TIPO_MOVIM",
      "MONTO_TRAM",
      "COD_OPERACION",
      "CCO_ORIGEN",
      "CCO_MOTIVO",
    ]),
    buildCsvLine([
      sale.site_transaction_id,
      sale.fecha.slice(0, 10).split("-").reverse().join("/"),
      sale.bandera ?? batch.bandera,
      `***${String(last4).padStart(4, "0")}`,
      "Contracargo",
      (-amount).toFixed(2).replace(".", ","),
      String(Math.floor(100000 + Math.random() * 900000)),
      reason.origen,
      reason.motivo,
    ]),
  ];
  return {
    csv: "\uFEFF" + lines.join("\r\n") + "\r\n",
    filename: `contracargos_test_${batch.codigo}_${stamp}.csv`,
    filas: 1,
    pagosUsados: 1,
    siteTransactionId: sale.site_transaction_id,
    monto: amount,
  };
}
