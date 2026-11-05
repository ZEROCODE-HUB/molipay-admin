import { AppError } from "./errors";

/**
 * Dinero en centavos enteros (ARS, 2 decimales).
 *
 * - Nunca floats para calcular: se parsea desde el texto decimal, nunca `x * 100`.
 * - Cada valor se valida con Number.isSafeInteger.
 * - Hacia las APIs se manda como texto decimal ("1234.56"), igual que las columnas numeric.
 * - El frontend NO es la autoridad: saldos e importes definitivos los calcula la base.
 *   Esto sirve para mostrar, sumar en pantalla y validar entradas.
 */
export type Money = { readonly cents: number };

const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

function invalid(detail: string): AppError {
  return new AppError("validation", "Importe inválido.", { cause: new Error(detail) });
}

export function moneyFromCents(cents: number): Money {
  if (!Number.isSafeInteger(cents)) throw invalid(`centavos fuera de rango: ${cents}`);
  return { cents };
}

/**
 * Desde un valor de la base (numeric: number o texto). Mas de 2 decimales se
 * redondean al centavo con "half up" (explicito; las columnas de saldo ya vienen con 2).
 */
export function moneyFromDecimal(value: string | number | null | undefined): Money {
  if (value == null || value === "") return moneyFromCents(0);
  const text = typeof value === "number" ? String(value) : value.trim();
  const match = DECIMAL.exec(text);
  if (!match) throw invalid(`decimal invalido: ${text}`);
  const [, sign, whole, fraction = ""] = match;
  const firstTwo = (fraction + "00").slice(0, 2);
  let cents = BigInt(whole) * 100n + BigInt(firstTwo);
  if (fraction.length > 2 && Number(fraction[2]) >= 5) cents += 1n;
  if (sign) cents = -cents;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw invalid(`importe fuera de rango: ${text}`);
  }
  return moneyFromCents(Number(cents));
}

/**
 * Lo que escribe el usuario: "1.234,56", "1234,5", "1234.56" o "1234".
 * Devuelve null si no es un importe valido o tiene mas de 2 decimales.
 */
export function parseMoneyInput(input: string): Money | null {
  const raw = input.trim().replace(/\s|\$/g, "");
  if (!raw) return null;
  // Con coma: la coma es decimal y los puntos son miles. Sin coma: el punto es decimal,
  // salvo que agrupe de a 3 ("1.500" = mil quinientos, no 1,50).
  const onlyThousands = /^\d{1,3}(\.\d{3})+$/.test(raw);
  const normalized =
    raw.includes(",") || onlyThousands ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const match = DECIMAL.exec(normalized);
  if (!match || (match[3]?.length ?? 0) > 2) return null;
  try {
    return moneyFromDecimal(normalized);
  } catch {
    return null;
  }
}

export const addMoney = (a: Money, b: Money): Money => moneyFromCents(a.cents + b.cents);

export const sumMoney = (values: Money[]): Money => values.reduce(addMoney, moneyFromCents(0));

export const compareMoney = (a: Money, b: Money): number => Math.sign(a.cents - b.cents);

export const isPositiveMoney = (m: Money): boolean => m.cents > 0;

/** "1234.56" (para RPC y APIs). */
export function toDecimalString(m: Money): string {
  const abs = Math.abs(m.cents);
  return `${m.cents < 0 ? "-" : ""}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** "$ 1.234,56" sin pasar por floats. */
export function formatMoneyAmount(m: Money): string {
  const abs = Math.abs(m.cents);
  const whole = Math.trunc(abs / 100).toLocaleString("es-AR");
  const fraction = String(abs % 100).padStart(2, "0");
  return `$ ${m.cents < 0 ? "-" : ""}${whole},${fraction}`;
}

/**
 * Importe escrito por el usuario como number en pesos, para mandarlo a una RPC o API que
 * recibe numeric. 0 si no es valido. Las cuentas se hacen siempre en centavos, no con este valor.
 */
export function moneyInputToNumber(input: string): number {
  const money = parseMoneyInput(input);
  return money ? Number(toDecimalString(money)) : 0;
}

/** Suma valores de la base en centavos y devuelve pesos (para totales de pantalla). */
export function sumDecimals(values: Array<string | number | null | undefined>): number {
  return Number(toDecimalString(sumMoney(values.map(moneyFromDecimal))));
}
