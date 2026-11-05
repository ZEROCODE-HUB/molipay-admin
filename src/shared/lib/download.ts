import * as XLSX from "xlsx";

/** Descarga un archivo generado en el navegador. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Algunos navegadores todavia leen la URL despues del click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga un texto ya armado (CSV, TXT…). El formato del contenido lo decide quien llama. */
export function downloadText(
  filename: string,
  text: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  downloadBlob(filename, new Blob([text], { type: mimeType }));
}

/** Descarga filas (una columna por clave) como planilla .xlsx de una hoja. */
export function downloadXlsx(
  filename: string,
  rows: Record<string, unknown>[],
  { sheetName = "Reporte" }: { sheetName?: string } = {},
): void {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
  XLSX.writeFile(workbook, filename);
}
