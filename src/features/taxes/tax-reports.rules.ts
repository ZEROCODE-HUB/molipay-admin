import {
type Filing,
type ItemFiling,
type SircupaRow,
} from "@/features/taxes/iibb-reports.supabase";

/**
 * Reportes de IIBB: registro de presentaciones por periodo y tramo.
 *
 * - Tramos: 1 (dias 1-10), 2 (11-20), 3 (21-fin). Vencen al 3er dia habil
 *   posterior al cierre.
 * - Cada generacion es una version: la ultima queda vigente y las anteriores
 *   reemplazadas. Si el contenido no cambio, no se crea version nueva.
 * - Un tramo sin operaciones queda "Sin archivo" (no tiene pago: N/A).
 * - Presentado y pagado se registran en la version vigente; el pago requiere
 *   que este presentada.
 */

export const TIERS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: "Tramo 1 (1-10)" },
  { n: 2, label: "Tramo 2 (11-20)" },
  { n: 3, label: "Tramo 3 (21-fin)" },
];
export const tierLabel = (n: number) => TIERS.find((t) => t.n === n)?.label ?? `Tramo ${n}`;

export const fmtCreacion = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
export const date = (iso: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";

export const monthEnCurso = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

export const todayAr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

export const versionTxt = (r: Filing) => `v${r.version} ${r.vigente ? "vigente" : "reemplazada"}`;
export const filedTxt = (r: Filing) => (r.presentadoAt ? "Sí" : "No");
export const paidTxt = (r: Filing) =>
  r.archivo === "Sin archivo" ? "N/A" : r.pagadoAt ? "Sí" : "No";

export const nameBase = (r: Filing) =>
  `${r.impuestoCodigo.toLowerCase()}-${r.periodo}-tramo-${r.tramo}-v${r.version}`;

// ---------------------------------------------------------------------------
// TXT de SIRCUPA (ISO-8859-1): una linea por CUIT y cuenta, separada por comas, CRLF
// ---------------------------------------------------------------------------
//   Anio, Mes, Tramo, CUIT, CVU, Base acumulada, Monto retenido acumulado,
//   Tipo de cuenta, Moneda (1), Cantidad de movimientos, CRC del padron,
//   ID de devolucion (0), Tipo de registro (1), Codigo de excepcion (0)

/** Sin valor definido todavia: va vacio para que no se declare un dato inventado. */
export const SIRCUPA_ACCOUNT_TYPE = "";

export function lineSircupa(r: Pick<Filing, "periodo" | "tramo">, row: SircupaRow): string {
  const [year, month] = r.periodo.split("-");
  return [
    year,
    month,
    r.tramo,
    row.cuit,
    row.cvu,
    row.base.toFixed(2),
    row.monto.toFixed(2),
    SIRCUPA_ACCOUNT_TYPE,
    1,
    row.movimientos,
    row.crc,
    0,
    1,
    0,
  ].join(",");
}

export const contentTxt = (r: Pick<Filing, "periodo" | "tramo">, rows: SircupaRow[]) =>
  rows.map((row) => lineSircupa(r, row) + "\r\n").join("");

/** Datos que faltan para presentar el archivo. */
export function sircupaMissing(rows: SircupaRow[]): string[] {
  const missing = (fn: (row: SircupaRow) => boolean, label: string) => {
    const n = rows.filter(fn).length;
    return n > 0 ? [`${n} ${label}`] : [];
  };
  return [
    ...missing((row) => row.cuit.length !== 11, "sin CUIT válido"),
    ...missing((row) => !row.cvu, "sin CVU"),
    ...missing((row) => !row.crc, "sin CRC del padrón"),
  ];
}

/** ISO-8859-1: los caracteres fuera de Latin-1 se reemplazan por "?". */
export function latin1(text: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(text.length));
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[i] = c < 256 ? c : 63;
  }
  return out;
}

export function contentCsv(r: Filing, items: ItemFiling[]) {
  const cab = [
    "Tipo",
    "Fecha",
    "CUIT",
    "Razón social",
    "Legajo",
    "Base",
    "Alícuota %",
    "Monto",
    "TXID interno",
  ];
  const rows = items.map((i) =>
    [
      i.tipo,
      date(i.fecha),
      i.cuit,
      i.razonSocial ?? "",
      i.legajo,
      i.base.toFixed(2),
      i.alicuota.toString(),
      i.monto.toFixed(2),
      i.transactionId,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const summary = `"${r.impuestoCodigo} ${r.periodo} ${tierLabel(r.tramo)} ${versionTxt(r)}";"Registros: ${r.registros}";"Total: ${r.totalRetenido.toFixed(2)}"`;
  return "﻿" + [summary, cab.join(";"), ...rows].join("\n") + "\n";
}

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const selectCls =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
