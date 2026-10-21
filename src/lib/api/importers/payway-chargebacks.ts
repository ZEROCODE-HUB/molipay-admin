import * as XLSX from "xlsx";
import {
  buildHeaderMap,
  normalizeHeader,
  type PaywayField,
  type ParsedPaywayRow,
} from "./payway-headers";

/**
 * Fila cruda del archivo de PayWay con los headers normalizados que
 * matchearon contra `PAYWAY_DISPUTE_HEADERS`.
 */
export type PaywayDisputeRow = {
  /** Headers que no se pudieron mapear a un campo conocido. */
  unresolvedHeaders: string[];
  /** Fila indexada por nombre crudo del header en el archivo. */
  raw: Record<string, string>;
  /** Fila normalizada: solo los campos que se reconocieron. */
  parsed: Partial<ParsedPaywayRow>;
  /** Errores de parseo de esta fila (monto inválido, fecha inválida, etc). */
  errors: string[];
};

export type ParsedPaywayFile = {
  rows: PaywayDisputeRow[];
  unresolvedHeaders: string[];
  totalRows: number;
  format: "csv" | "xlsx";
};

/**
 * Detecta el formato por la extensión. No confiamos en el MIME type
 * porque algunos navegadores lo reportan vacío.
 */
function detectFormat(file: File): "csv" | "xlsx" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return "csv";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  return null;
}

/**
 * Lee el archivo y devuelve un array de objetos (uno por fila) donde
 * las claves son los headers crudos (primera fila).
 */
async function readRows(
  file: File,
  format: "csv" | "xlsx",
): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();

  if (format === "xlsx") {
    const wb = XLSX.read(buf, { type: "array", raw: false });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    // defval: '' para que no aparezcan celdas como undefined
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false, // nos importa el string formateado (montos con coma, etc)
    });
  }

  // CSV: usamos SheetJS también (soporta CSV) para no agregar papaparse.
  // Para CSVs muy grandes (>50MB) SheetJS puede ser más lento que
  // papaparse, pero el reporte de PayWay no suele pasar los 5MB.
  const wb = XLSX.read(buf, { type: "array", raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
}

/**
 * Lee el archivo y devuelve una matriz de celdas (string[][]). A
 * diferencia de `readRows`, no intenta adivinar cuál es la fila
 * de headers: devuelve TODO en orden. Lo usamos para encontrar la
 * fila de headers aunque haya un título arriba.
 */
async function readMatrix(
  file: File,
  format: "csv" | "xlsx",
): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils
    .sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false })
    .map((row) => (Array.isArray(row) ? row : []));
}

/**
 * Busca la primera fila que matchee al menos un alias de los
 * campos críticos (idTransaccion, monto, fecha, etc.). Esa es la
 * fila de headers. Devuelve el índice (0-based) o 0 si no encontró
 * ningún match (cae a la primera fila).
 */
function findHeaderRow(matrix: string[][]): number {
  const criticalAliases: string[] = [
    "id_transaccion",
    "tid",
    "id_tx",
    "id_transaccion_payway",
    "site_transaction_id",
    "monto_de_tram",
    "monto",
    "total_bruto",
    "amount",
    "importe",
    "fecha_de_trans",
    "fecha",
    "fecha_transaccion",
    "date",
  ];
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const normalized = row.map((c) => normalizeHeader(String(c ?? "")));
    if (normalized.some((h) => criticalAliases.includes(h))) {
      return i;
    }
  }
  return 0;
}

/**
 * Normaliza un monto: "1.234,56" → 1234.56, "1234.56" → 1234.56.
 * Maneja separadores de miles (.) y decimales (,), o al revés.
 */
export function parseMonto(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  if (!cleaned) return null;

  // Si tiene ambos . y , el último es el decimal.
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = cleaned;
  } else if (lastComma > lastDot) {
    // Formato AR: 1.234,56 → quitamos . y reemplazamos , por .
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Formato US: 1,234.56 → quitamos , y dejamos .
    normalized = cleaned.replace(/,/g, "");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Normaliza una fecha. PayWay a veces exporta "2026-10-09 14:32:00",
 * otras "2026-10-09", otras "09/10/2026". Hacemos un best-effort.
 * Devuelve ISO string o null.
 */
export function parseFecha(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, dd, mm, yyyy, hh, mi, ss] = m;
    const year = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy);
    const iso = new Date(
      Date.UTC(
        year,
        Number(mm) - 1,
        Number(dd),
        Number(hh ?? "0"),
        Number(mi ?? "0"),
        Number(ss ?? "0"),
      ),
    );
    return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
  }

  // Fallback: dejar que Date lo resuelva
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normaliza un número de tarjeta. Acepta "4509953566233704",
 * "4509-9535-6623-3704" o "****1234". Devuelve "****1234".
 */
export function parseTarjetaMasked(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).replace(/[\s-]/g, "").trim();
  if (!s) return null;
  const last4 = s.slice(-4);
  if (!/^\d{4}$/.test(last4)) return null;
  return `****${last4}`;
}

export async function parsePaywayFile(file: File): Promise<ParsedPaywayFile> {
  const format = detectFormat(file);
  if (!format) {
    throw new Error(
      "Formato no soportado. Acepta .csv o .xlsx (máx 10MB).",
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo supera los 10MB. Dividilo en partes más chicas.");
  }

  // Leemos el archivo como matriz (array de arrays) para poder
  // encontrar la fila de headers real. El parser de liquidaciones
  // (parse.ts) hace esto mismo: las líneas antes del header se
  // ignoran, así que un título de periodo arriba no rompe.
  const rawMatrix = await readMatrix(file, format);
  if (rawMatrix.length === 0) {
    return { rows: [], unresolvedHeaders: [], totalRows: 0, format };
  }

  // Buscamos la primera fila que matchee al menos un alias conocido
  // (idTransaccion, monto, etc.). Esa es nuestra fila de headers.
  // Si no encontramos, caemos a la primera fila (comportamiento
  // legacy).
  const headerRowIdx = findHeaderRow(rawMatrix);
  const headerRow = rawMatrix[headerRowIdx] ?? [];
  const headers = headerRow.map((c) => String(c ?? "").trim()).filter(Boolean);
  const { map, unresolved } = buildHeaderMap(headers);

  // Reconstruimos las filas de datos: todo lo que está después del
  // header. Usamos los headers como keys.
  const dataRows = rawMatrix.slice(headerRowIdx + 1);
  const rawRows = dataRows
    .filter((row) => row.some((c) => String(c ?? "").trim() !== "")) // descarta filas vacías
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? "").trim();
      });
      return obj;
    });

  // Si no pudimos mapear ningún header crítico, fallamos explícito.
  const required: PaywayField[] = ["idTransaccion", "monto"];
  const missing = required.filter((f) => !map.has(f));
  if (missing.length > 0) {
    throw new Error(
      `Faltan columnas obligatorias en el archivo: ${missing.join(", ")}. ` +
        `Headers reconocidos: ${Array.from(map.keys()).join(", ") || "(ninguno)"}. ` +
        `Headers no reconocidos: ${unresolved.join(", ") || "(ninguno)"}.`,
    );
  }

  const rows: PaywayDisputeRow[] = rawRows.map((raw, idx) => {
    const parsed: Partial<ParsedPaywayRow> = {};
    const errors: string[] = [];

    for (const [field, headerName] of map.entries()) {
      const value = String(raw[headerName] ?? "").trim();
      if (value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (parsed as any)[field] = value;
      }
    }

    // Validaciones de campo
    if (!parsed.idTransaccion) {
      errors.push(`Fila ${idx + 2}: falta ID_TRANSACCION (TID).`);
    }
    const monto = parseMonto(parsed.monto);
    if (monto == null) {
      errors.push(
        `Fila ${idx + 2}: monto inválido "${parsed.monto ?? ""}".`,
      );
    } else if (monto <= 0) {
      errors.push(`Fila ${idx + 2}: monto debe ser mayor a 0.`);
    }

    const fecha = parseFecha(parsed.fechaTransaccion);
    if (parsed.fechaTransaccion && !fecha) {
      errors.push(
        `Fila ${idx + 2}: fecha inválida "${parsed.fechaTransaccion}".`,
      );
    }

    const tarjeta = parseTarjetaMasked(parsed.nroTarjeta);
    if (parsed.nroTarjeta && !tarjeta) {
      errors.push(
        `Fila ${idx + 2}: no se pudo enmascarar la tarjeta "${parsed.nroTarjeta}".`,
      );
    }

    return {
      raw,
      parsed: {
        ...parsed,
        // Reemplazamos con la versión normalizada si está disponible.
        ...(tarjeta ? { nroTarjeta: tarjeta } : {}),
      },
      errors,
      unresolvedHeaders: [],
    };
  });

  return {
    rows,
    unresolvedHeaders: unresolved,
    totalRows: rawRows.length,
    format,
  };
}
