import { AppError } from "./errors";

const CONTRACT_MESSAGE = "Recibimos datos inesperados. Ya quedó registrado; probá más tarde.";

/**
 * Valida un valor que viene de la base contra los permitidos. Si no coincide,
 * lanza un AppError "contract": nunca se acepta en silencio ni se convierte en
 * otro valor valido.
 */
export function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value))
    return value as T;
  throw new AppError("contract", CONTRACT_MESSAGE, {
    context: { operation: field },
    cause: new Error(`Valor inesperado en ${field}: ${JSON.stringify(value)}`),
  });
}

/** Igual que parseEnum, pero traduce el valor de la base (p. ej. "activo" -> "active"). */
export function parseEnumMap<TDb extends string, T extends string>(
  value: unknown,
  map: Record<TDb, T>,
  field: string,
): T {
  const key = parseEnum(value, Object.keys(map) as TDb[], field);
  return map[key];
}
