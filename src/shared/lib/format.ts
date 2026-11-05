/**
 * Formato de valores para mostrar en pantalla (es-AR).
 * Solo presentacion: no redondea ni calcula importes.
 */

const EMPTY = "—";

const MONEY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** "$ 1.234,56". Sin valor: "—". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return EMPTY;
  return `$ ${value.toLocaleString("es-AR", MONEY_FORMAT)}`;
}

/** "02/11/2026, 14:30" (con `seconds`: "02/11/2026, 14:30:05"), en hora local. Sin valor: "—". */
export function formatDateTime(
  iso: string | null | undefined,
  options: { seconds?: boolean } = {},
): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options.seconds ? { second: "2-digit" } : {}),
  });
}

/** "2026-11-02" -> "02/11/2026" sin pasar por Date (no corre el dia por zona horaria). Sin valor: "—". */
export function formatIsoDate(isoDate: string | null | undefined): string {
  if (!isoDate) return EMPTY;
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
