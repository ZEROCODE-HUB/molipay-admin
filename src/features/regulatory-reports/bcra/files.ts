/**
 * Serialización de los archivos BCRA (Com. "A" 8207) a partir de la foto
 * guardada en bcra_presentaciones. Todas las celdas XLSX van como texto para
 * no perder ceros a la izquierda (códigos, esquemas, CBU).
 */

import * as XLSX from "xlsx";
import type {
BcraFile,
RowA,
RowB,
RowBcra,
RowI,
} from "@/features/regulatory-reports/bcra.supabase";
import type { RowRegistry } from "@/features/regulatory-reports/bcra/registry";
import { construirXlsxRegistry } from "@/features/regulatory-reports/bcra/xlsx";
import { createZip } from "@/features/regulatory-reports/bcra/zip";

/** Nombre de cada archivo dentro del paquete. */
export const NAME_EN_PACKAGE: Record<BcraFile, string> = {
  A: "apartado_a.xlsx",
  B: "apartado_b.xlsx",
  P: "padron.xlsx",
  I: "transf_intraentidades.txt",
};

/** "2026-09-01" -> "202609". */
export const aaaamm = (period: string) => period.slice(0, 7).replace("-", "");

export const nameFileIndividual = (period: string, file: BcraFile) =>
  `${aaaamm(period)}_${NAME_EN_PACKAGE[file]}`;

export const namePackage = (cuit: string, period: string) =>
  `BCRA_RI_PSPCP_${cuit.replace(/\D/g, "") || "CUIT"}_${aaaamm(period)}.zip`;

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function xlsxText(matrix: string[][], hoja: string, anchos: number[]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) {
        cell.t = "s";
        cell.v = String(cell.v ?? "");
      }
    }
  }
  ws["!cols"] = anchos.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

/** Encabezado del Apartado A tal como figura en el modelo de Compliance. */
const HEADER_A = ["LEGAJO", "MONTO", "MONTO EN CUENTA SIN 3 CEROS ULTIMOS", ""];

export function matrixApartadoA(rows: RowA[]): string[][] {
  return [HEADER_A, ...rows.map((f) => [txt(f.codigo), txt(f.monto), txt(f.cantidad), txt(f.aux)])];
}

export function matrixApartadoB(rows: RowB[]): string[][] {
  return rows.map((f) => [
    txt(f.codigo),
    txt(f.medio),
    txt(f.esquema),
    txt(f.cantidad),
    txt(f.monto),
  ]);
}

/** Partida;MedioPago;Moneda;TipoTitular;Cantidad;MontoEnMiles */
export function textIntraentidades(rows: RowI[]): string {
  return rows
    .map((f) => [f.codigo, f.medio, f.moneda, f.titular, f.cantidad, f.monto].map(txt).join(";"))
    .join("\r\n");
}

/** Contenido binario/texto de un archivo a partir de sus filas guardadas. */
export function contentFile(file: BcraFile, rows: RowBcra[]): ArrayBuffer | string {
  switch (file) {
    case "A":
      return xlsxText(matrixApartadoA(rows as RowA[]), "Apartado A", [10, 16, 16, 26]);
    case "B":
      return xlsxText(matrixApartadoB(rows as RowB[]), "Apartado B", [10, 6, 8, 12, 16]);
    case "P":
      return construirXlsxRegistry(rows as unknown as RowRegistry[]);
    case "I":
      return textIntraentidades(rows as RowI[]);
  }
}

function bajar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadFile(period: string, file: BcraFile, rows: RowBcra[]) {
  const c = contentFile(file, rows);
  const type =
    typeof c === "string"
      ? "text/plain;charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  bajar(new Blob([c], { type }), nameFileIndividual(period, file));
}

export function downloadPackage(
  cuit: string,
  period: string,
  files: { archivo: BcraFile; filas: RowBcra[] }[],
) {
  const zip = createZip(
    files.map((a) => ({ name: NAME_EN_PACKAGE[a.archivo], data: contentFile(a.archivo, a.filas) })),
  );
  bajar(zip, namePackage(cuit, period));
}
