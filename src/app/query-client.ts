import { QueryClient } from "@tanstack/react-query";
import { isRetryable } from "@/shared/lib/errors";

/** Frescura segun el tipo de dato (no un valor unico para todo). */
export const STALE = {
  /** Saldos, actividad: cambian seguido. */
  short: 15_000,
  /** Perfiles, listados de gestion. */
  moderate: 60_000,
  /** Catalogos (permisos, bancos, endpoints). */
  long: 10 * 60_000,
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Solo fallas transitorias (red, desconocidas); nunca permisos, validacion ni datos inesperados.
        // Los errores legacy (no AppError) mantienen el comportamiento de antes: hasta 3 reintentos.
        retry: (failureCount, error) => failureCount < 3 && isRetryable(error),
      },
      mutations: {
        // Nunca reintentar escrituras automaticamente (pueden ser operaciones de dinero).
        retry: false,
      },
    },
  });
}
