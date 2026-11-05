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
