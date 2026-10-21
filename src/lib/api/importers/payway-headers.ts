/**
 * Headers normalizados del reporte de Alertas Tempranas de PayWay.
 *
 * PayWay puede cambiar mayúsculas, separadores, o nombres de columna
 * entre reportes. Mantener un solo punto de verdad permite ajustar
 * el parser sin tocar la lógica de import.
 *
 * Cada campo declara un array de alias: el primero es el nombre
 * "oficial" según la documentación; los demás son variantes
 * observadas / razonables.
 */
export const PAYWAY_DISPUTE_HEADERS = {
  idTransaccion: [
    "ID_TRANSACCION",
    "TID",
    "ID_TX",
    "ID_TRANSACCION_PAYWAY",
    "SITE_TRANSACTION_ID",
  ],
  establecimiento: [
    "ESTABLECIMIENTO",
    "SITE_ID",
    "NRO_ESTABLECIMIENTO",
    "COMERCIO",
  ],
  fechaTransaccion: [
    "FECHA_DE_TRANS",
    "FECHA",
    "FECHA_TRANSACCION",
    "DATE",
    "FECHA_OPERACION",
  ],
  marca: ["MEDIO_DE_PAGO", "MARCA", "BRAND", "MEDIO_PAGO"],
  nroTarjeta: ["NRO_DE_TARJETA", "TARJETA", "CARD_NUMBER", "ULTIMOS4"],
  monto: ["MONTO_DE_TRAM", "MONTO", "TOTAL_BRUTO", "AMOUNT", "IMPORTE"],
  autorizacion: [
    "CODIGO_DE_AUT",
    "AUTORIZACION",
    "NRO_DE_CUPON",
    "AUTH_CODE",
    "NRO_CUPON",
  ],
  ccoOrigen: ["CCO_ORIGEN", "ORIGEN", "ORIGIN", "CANAL_ORIGEN"],
  ccoMotivo: [
    "CCO_MOTIVO",
    "MOTIVO",
    "REASON",
    "DESCRIPCION_MOTIVO",
    "MOTIVO_DESCONOCIMIENTO",
  ],
  estado: ["ESTADO", "STATUS", "ESTADO_PRESENTACION"],
} as const;

export type PaywayField = keyof typeof PAYWAY_DISPUTE_HEADERS;

export type ParsedPaywayRow = {
  [K in PaywayField]: string;
};

/**
 * Normaliza un header del CSV para matchear contra los alias.
 * - Trim
 * - Mayúsculas
 * - Quita tildes y diacríticos (ID_TRANSACCIÓN → ID_TRANSACCION)
 * - Reemplaza separadores no estándar
 */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacríticos
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Construye un mapa: header normalizado del archivo → campo Payway.
 * Si una variante no matchea con ninguno de los alias registrados,
 * el campo queda sin resolver y la fila se reporta como "error de
 * parseo".
 */
export function buildHeaderMap(
  rawHeaders: string[],
): { map: Map<PaywayField, string>; unresolved: string[] } {
  const map = new Map<PaywayField, string>();
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawHeaders) {
    const norm = normalizeHeader(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);

    let matched: PaywayField | null = null;
    for (const [field, aliases] of Object.entries(PAYWAY_DISPUTE_HEADERS) as [
      PaywayField,
  readonly string[],
][]) {
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        matched = field;
        break;
      }
    }

    if (matched) {
      // Si dos headers crudos matchean al mismo campo, gana el primero
      if (!map.has(matched)) map.set(matched, raw);
    } else {
      unresolved.push(raw);
    }
  }

  return { map, unresolved };
}
