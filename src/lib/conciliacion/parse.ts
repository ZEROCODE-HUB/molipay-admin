// Parser robusto para archivo banco COELSA.
// El xlsx real viene con 1 sola columna A donde cada celda es CSV separado por ";"
// (ver public/conciliation_20260903.xlsx). También soporta xlsx/csv normales.
import * as XLSX from "xlsx";

export type BankRow = {
  // crudos
  fechaNegocio: string; // "3/9/2026"
  idDebin: string; // ID_DEBIN -> mapeará a movimientos.id_txn
  tipoMovCoelsa: string; // DEBITO | CREDITO
  cbu: string;
  ctaBtDelCbu: string;
  btSbo: string;
  btTop: string;
  denominacion: string;
  cuit: string;
  importeCoelsa: number; // parseado de "-14,355.00"
  importeRaw: string;
  estadoCoelsa: string; // COMPLETADA | NO COMPLETADA
  astoEstado: string; // CONFIRMADO | ""
  cvu: string;
  cuitVirtual: string;
  cvu2: string;
  cuitVirtual2: string;
  cbu2: string;
  cuit2: string;
  concepto: string;
  mismoTit: string;
  detalle: string;
  cvuCredito: string;
  fechaHoraCoelsa: string; // "03/09/2026 00:11:55"
  raw: Record<string, string>;
};

const HEADER_EXPECTED = [
  "FECHA_NEGOCIO",
  "ID_DEBIN",
  "TIPO_MOV_COELSA",
  "CBU",
  "CTA_BT_DEL_CBU",
  "BT_SBO",
  "BT_TOP",
  "DENOMINACION",
  "CUIT",
  "IMPORTE_COELSA",
  "ESTADO_COELSA",
  "ASTO_ESTADO",
  "CVU",
  "CUIT_VIRTUAL",
  "CVU_2",
  "CUIT_VIRTUAL_2",
  "CBU_2",
  "CUIT_2",
  "CONCEPTO",
  "MISMO_TIT",
  "DETALLE",
  "CVU_CREDITO",
  "FECHA_HORA_COELSA",
] as const;

export function parseImporte(raw: string): number {
  if (!raw) return 0;
  // "-14,355.00" -> remove commas (thousands) keep dot decimal, keep sign
  const cleaned = raw.trim().replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeHeader(h: string): string {
  return h.trim().replace(/\r/g, "").replace(/\n/g, "").replace(/_x000d_$/i, "");
}

export async function parseBancoFile(file: File): Promise<BankRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: true });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  if (!ws) return [];

  // Leer como matriz de filas (array of arrays) sin header interpretation
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  if (rows.length === 0) return [];

  // Caso especial COELSA: 1 sola columna donde la celda contiene todo separado por ";"
  // Detectar si header está en A1 como string con ";"
  const firstCell = String(rows[0]?.[0] ?? "");
  const isSingleColumnSemicolon = firstCell.includes(";") && firstCell.includes("ID_DEBIN");
  let header: string[] = [];
  let dataRows: string[][] = [];

  if (isSingleColumnSemicolon) {
    header = firstCell.split(";").map(normalizeHeader);
    for (let i = 1; i < rows.length; i++) {
      const cell = String(rows[i]?.[0] ?? "");
      if (!cell.trim()) continue;
      // split por ";" conservando vacíos
      const parts = cell.split(";");
      // normalizar longitud a header length
      while (parts.length < header.length) parts.push("");
      dataRows.push(parts.slice(0, header.length).map((s) => s.trim()));
    }
  } else {
    // xlsx normal: header en primera fila columnas separadas
    header = (rows[0] as string[]).map((c) => normalizeHeader(String(c ?? "")));
    // Si header no coincide con COLSA, igual funciona
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      if (!r || r.every((v) => String(v ?? "").trim() === "")) continue;
      dataRows.push(r.map((v) => String(v ?? "").trim()));
    }
  }

  // Si header no tiene ID_DEBIN pero sí está en otra forma, intentar detectar delimitador alternativo
  if (!header.includes("ID_DEBIN")) {
    // intentar buscar header por contenido
    // fallback: tratar como CSV con delimiter auto
    throw new Error(`Header no reconocido. Columnas encontradas: ${header.join(", ")}`);
  }

  const idx = (name: string) => header.indexOf(name);

  const out: BankRow[] = [];
  for (const parts of dataRows) {
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (parts[i] ?? "") : "";
    };
    // algunos archivos traen FECHA_HORA_COELSA con sufijo _x000d_
    const fechaHora = get("FECHA_HORA_COELSA") || get("FECHA_HORA_COELSA_x000d_") || "";
    const importeRaw = get("IMPORTE_COELSA");
    const raw: Record<string, string> = {};
    header.forEach((h, i) => (raw[h] = parts[i] ?? ""));
    out.push({
      fechaNegocio: get("FECHA_NEGOCIO"),
      idDebin: get("ID_DEBIN"),
      tipoMovCoelsa: get("TIPO_MOV_COELSA"),
      cbu: get("CBU"),
      ctaBtDelCbu: get("CTA_BT_DEL_CBU"),
      btSbo: get("BT_SBO"),
      btTop: get("BT_TOP"),
      denominacion: get("DENOMINACION"),
      cuit: get("CUIT"),
      importeRaw,
      importeCoelsa: parseImporte(importeRaw),
      estadoCoelsa: get("ESTADO_COELSA"),
      astoEstado: get("ASTO_ESTADO"),
      cvu: get("CVU"),
      cuitVirtual: get("CUIT_VIRTUAL"),
      cvu2: get("CVU_2"),
      cuitVirtual2: get("CUIT_VIRTUAL_2"),
      cbu2: get("CBU_2"),
      cuit2: get("CUIT_2"),
      concepto: get("CONCEPTO"),
      mismoTit: get("MISMO_TIT"),
      detalle: get("DETALLE"),
      cvuCredito: get("CVU_CREDITO"),
      fechaHoraCoelsa: fechaHora,
      raw,
    });
  }
  return out;
}

export function isNoCompletada(r: BankRow): boolean {
  return r.estadoCoelsa.trim().toUpperCase() === "NO COMPLETADA";
}

export function isDebito(r: BankRow): boolean {
  return r.tipoMovCoelsa.trim().toUpperCase() === "DEBITO";
}
export function isCredito(r: BankRow): boolean {
  return r.tipoMovCoelsa.trim().toUpperCase() === "CREDITO";
}
