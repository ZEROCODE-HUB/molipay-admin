/**
 * Serializa las filas del padrón BCRA a un `.xlsx` sin encabezado.
 *
 * No se puede usar `json_to_sheet` ni `data_to_sheet` con header: el archivo
 * que recibe el regulador no admite fila de encabezado, y el orden/anchura de
 * las columnas es fijo. Por eso se construye la matriz manualmente y se
 * declaran los anchos en caracteres.
 */

import * as XLSX from "xlsx";
import type { RowRegistry } from "@/features/regulatory-reports/bcra/registry";
import { ANCHO_CP,ANCHO_RAZON_SOCIAL } from "@/features/regulatory-reports/bcra/registry";

/** Orden de columnas del padrón, tal como lo exige el régimen. */
const COLUMNS_REGISTRY: (keyof RowRegistry)[] = [
  "tipoDocumento",
  "cuit",
  "sufijo",
  "vacio",
  "razonSocial",
  "flag",
  "codigoPostal",
  "tipoPersonaSocietaria",
];

/** Ancho en caracteres por columna, alineado al contenido del régimen. */
const ANCHOS: Record<keyof RowRegistry, number> = {
  tipoDocumento: 3,
  cuit: 11,
  sufijo: 2,
  vacio: 1,
  razonSocial: ANCHO_RAZON_SOCIAL,
  flag: 1,
  codigoPostal: ANCHO_CP,
  tipoPersonaSocietaria: 2,
};

/** Convierte las filas del padrón a una matriz sin encabezado. */
function aMatrix(rows: RowRegistry[]): (string | number)[][] {
  return rows.map((f) => COLUMNS_REGISTRY.map((col) => f[col]));
}

/**
 * Devuelve un `ArrayBuffer` con el `.xlsx` del padrón.
 *
 * Todas las celdas se escriben como texto: el regulador espera valores
 * literales y Excel convertiría el CUIT o el código postal a número, perdiendo
 * los ceros a la izquierda (ej. un CPA como `C1426BBS`).
 */
export function construirXlsxRegistry(rows: RowRegistry[]): ArrayBuffer {
  const matrix = aMatrix(rows);
  const ws = XLSX.utils.aoa_to_sheet(matrix, { cellDates: false });

  // Fuerza el tipo texto en todas las celdas para preservar ceros a la izquierda.
  // Se itera la matriz (no el `!ref` de la hoja) porque con cero filas
  // `aoa_to_sheet` deja la hoja sin rango definido.
  for (let R = 0; R < matrix.length; ++R) {
    for (let C = 0; C < COLUMNS_REGISTRY.length; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell) cell.t = "s";
    }
  }

  ws["!cols"] = COLUMNS_REGISTRY.map((col) => ({ wch: ANCHOS[col] }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Padron");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

/** Dispara la descarga del `.xlsx` generado. */
export function downloadRegistry(filename: string, rows: RowRegistry[]): void {
  const buffer = construirXlsxRegistry(rows);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
