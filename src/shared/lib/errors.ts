/**
 * Error comun de la app.
 *
 * - `kind`: clasificacion interna; de ahi sale si se puede reintentar.
 * - `message`: texto en español para mostrar al usuario (nunca el error crudo del proveedor).
 * - `field`: campo del formulario al que corresponde, si aplica.
 * - `context`: datos para diagnosticar (feature, operacion, request id). Sin datos sensibles.
 * - `cause`: error original, solo para logs.
 */

export type AppErrorKind =
  | "permission"
  | "not_found"
  | "validation"
  | "conflict"
  | "contract"
  | "network"
  | "unknown";

export type AppErrorContext = { feature?: string; operation?: string; requestId?: string };

/** Politica central: solo fallas transitorias se reintentan. */
const RETRYABLE: Record<AppErrorKind, boolean> = {
  permission: false,
  not_found: false,
  validation: false,
  conflict: false,
  contract: false,
  network: true,
  unknown: true,
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly field?: string;
  readonly context: AppErrorContext;

  constructor(
    kind: AppErrorKind,
    message: string,
    options: { field?: string; context?: AppErrorContext; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.kind = kind;
    this.field = options.field;
    this.context = options.context ?? {};
  }

  get retryable(): boolean {
    return RETRYABLE[this.kind];
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Para errores que no son AppError (codigo legacy) se mantiene el comportamiento anterior: reintentar. */
export function isRetryable(error: unknown): boolean {
  return isAppError(error) ? error.retryable : true;
}

/** Mensaje para el usuario de cualquier error. */
export function userMessage(
  error: unknown,
  fallback = "Ocurrió un error. Probá de nuevo.",
): string {
  return isAppError(error) ? error.message : fallback;
}
