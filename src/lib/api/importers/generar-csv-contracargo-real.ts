import { requireSupabase } from "@/lib/supabase";
import { DataAccessError } from "@/lib/api/errors";

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

export type PagoParaCsv = {
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

const MOTIVOS_DEMO: { motivo: string; origen: string; ccoOrigen: string }[] = [
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

const MARCAS = ["Visa", "Mastercard", "Amex", "Cabal"] as const;

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
export async function generarCsvContracargoDemo(
  cantidad = 5,
): Promise<CsvGenerado> {
  const sb = requireSupabase();

  // Traemos los últimos N pagos con TID
  const { data, error } = await sb
    .from("cliente_links_pago_pagos")
    .select("site_transaction_id, monto, created_at")
    .not("site_transaction_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(cantidad);
  if (error) throw new DataAccessError(error);

  const pagos = (data ?? []) as Array<{
    site_transaction_id: string;
    monto: number;
    created_at: string;
  }>;

  if (pagos.length === 0) {
    throw new Error(
      "No hay pagos con site_transaction_id en la base. " +
        "El importador necesita TIDs reales para matchear. " +
        "Generá primero un pago de prueba.",
    );
  }

  const fecha = new Date();
  const periodo = `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1,
  ).padStart(2, "0")}`;
  const fechaFmt = `${String(fecha.getDate()).padStart(2, "0")}/${String(
    fecha.getMonth() + 1,
  ).padStart(2, "0")}/${fecha.getFullYear()}`;

  const lineas: string[] = [
    // Línea 1: título del reporte (la salta el parser)
    `MoliPay - Reporte de Alertas Tempranas de Contracargos;Periodo ${periodo};Generado ${fecha.toLocaleString("es-AR")}`,
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

  pagos.forEach((p, i) => {
    const motivo = MOTIVOS_DEMO[i % MOTIVOS_DEMO.length]!;
    const marca = MARCAS[i % MARCAS.length]!;
    // Generamos un "último 4" determinístico a partir del TID.
    // No es el real (que no tenemos en la DB), pero es estable.
    const last4 = parseInt(p.site_transaction_id.slice(-4), 36) % 10000;
    const monto = Number(p.monto);
    // Fecha del pago (la del create_at) en formato DD/MM/YYYY
    const fechaPago = p.created_at
      ? p.created_at.slice(0, 10).split("-").reverse().join("/")
      : fechaFmt;
    // Codigo de autorizacion PayWay: derivado del TID para que sea
    // estable
    const codAut = `PW-TKT-${p.site_transaction_id.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase()}`;

    lineas.push(
      buildCsvLine([
        p.site_transaction_id,
        fechaPago,
        marca,
        pad4(last4),
        monto.toFixed(2),
        codAut,
        motivo.origen,
        motivo.motivo,
      ]),
    );
  });

  const csv = "\uFEFF" + lineas.join("\r\n");
  return {
    csv,
    filename: `contracargos_reales_${periodo}.csv`,
    filas: pagos.length,
    pagosUsados: pagos.length,
  };
}

/**
 * Helper que dispara la descarga del CSV en el navegador.
 */
export function descargarCsv(csvGenerado: CsvGenerado): void {
  const blob = new Blob([csvGenerado.csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvGenerado.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
