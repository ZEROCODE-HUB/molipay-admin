/**
 * Serialización de los archivos BCRA (Com. "A" 8207) a partir de la foto
 * guardada en bcra_presentaciones. Todas las celdas XLSX van como texto para
 * no perder ceros a la izquierda (códigos, esquemas, CBU).
 */

import * as XLSX from "xlsx";
import type { BcraArchivo, FilaA, FilaB, FilaBcra, FilaI } from "@/lib/api/bcra";
import type { FilaPadron } from "./padron";
import { construirXlsxPadron } from "./xlsx";
import { crearZip } from "./zip";

/** Nombre de cada archivo dentro del paquete. */
export const NOMBRE_EN_PAQUETE: Record<BcraArchivo, string> = {
  A: "apartado_a.xlsx",
  B: "apartado_b.xlsx",
  P: "padron.xlsx",
  I: "transf_intraentidades.txt",
};

/** "2026-09-01" -> "202609". */
export const aaaamm = (periodo: string) => periodo.slice(0, 7).replace("-", "");

export const nombreArchivoIndividual = (periodo: string, archivo: BcraArchivo) =>
  `${aaaamm(periodo)}_${NOMBRE_EN_PAQUETE[archivo]}`;

export const nombrePaquete = (cuit: string, periodo: string) =>
  `BCRA_RI_PSPCP_${cuit.replace(/\D/g, "") || "CUIT"}_${aaaamm(periodo)}.zip`;

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function xlsxTexto(matriz: string[][], hoja: string, anchos: number[]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(matriz);
  for (let r = 0; r < matriz.length; r++) {
    for (let c = 0; c < matriz[r].length; c++) {
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
const ENCABEZADO_A = ["LEGAJO", "MONTO", "MONTO EN CUENTA SIN 3 CEROS ULTIMOS", ""];

export function matrizApartadoA(filas: FilaA[]): string[][] {
  return [ENCABEZADO_A, ...filas.map((f) => [txt(f.codigo), txt(f.monto), txt(f.cantidad), txt(f.aux)])];
}

export function matrizApartadoB(filas: FilaB[]): string[][] {
  return filas.map((f) => [txt(f.codigo), txt(f.medio), txt(f.esquema), txt(f.cantidad), txt(f.monto)]);
}

/** Partida;MedioPago;Moneda;TipoTitular;Cantidad;MontoEnMiles */
export function textoIntraentidades(filas: FilaI[]): string {
  return filas.map((f) => [f.codigo, f.medio, f.moneda, f.titular, f.cantidad, f.monto].map(txt).join(";")).join("\r\n");
}

/** Contenido binario/texto de un archivo a partir de sus filas guardadas. */
export function contenidoArchivo(archivo: BcraArchivo, filas: FilaBcra[]): ArrayBuffer | string {
  switch (archivo) {
    case "A":
      return xlsxTexto(matrizApartadoA(filas as FilaA[]), "Apartado A", [10, 16, 16, 26]);
    case "B":
      return xlsxTexto(matrizApartadoB(filas as FilaB[]), "Apartado B", [10, 6, 8, 12, 16]);
    case "P":
      return construirXlsxPadron(filas as unknown as FilaPadron[]);
    case "I":
      return textoIntraentidades(filas as FilaI[]);
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

export function descargarArchivo(periodo: string, archivo: BcraArchivo, filas: FilaBcra[]) {
  const c = contenidoArchivo(archivo, filas);
  const type =
    typeof c === "string" ? "text/plain;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  bajar(new Blob([c], { type }), nombreArchivoIndividual(periodo, archivo));
}

export function descargarPaquete(cuit: string, periodo: string, archivos: { archivo: BcraArchivo; filas: FilaBcra[] }[]) {
  const zip = crearZip(archivos.map((a) => ({ name: NOMBRE_EN_PAQUETE[a.archivo], data: contenidoArchivo(a.archivo, a.filas) })));
  bajar(zip, nombrePaquete(cuit, periodo));
}
