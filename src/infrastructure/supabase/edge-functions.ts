import { AppError,type AppErrorContext,type AppErrorKind } from "@/shared/lib/errors";
import { requireSupabase } from "./client";

/**
 * Llama una Edge Function y convierte el error en AppError.
 *
 * Nuestras Edge Functions responden `{ error: "<mensaje en español>" }` con el
 * status HTTP que corresponde; supabase-js solo expone "non-2xx status code", asi
 * que el mensaje real se lee del body de la respuesta.
 */

const KIND_BY_STATUS: Record<number, AppErrorKind> = {
  400: "validation",
  401: "permission",
  403: "permission",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "validation",
};

const FALLBACK = "No se pudo completar la operación. Probá de nuevo.";

async function readErrorBody(
  error: unknown,
): Promise<{ status: number | null; message: string | null }> {
  const response = (error as { context?: Response })?.context;
  if (!response || typeof response.text !== "function") return { status: null, message: null };
  try {
    const text = await response.text();
    let message: string | null = null;
    try {
      const body = JSON.parse(text) as { error?: unknown; message?: unknown };
      message =
        typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : null;
    } catch {
      message = text ? text.slice(0, 400) : null;
    }
    return { status: response.status ?? null, message };
  } catch {
    return { status: response.status ?? null, message: null };
  }
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  options: { context?: AppErrorContext } = {},
): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(name, { body });
  if (!error) return data as T;

  const { status, message } = await readErrorBody(error);
  const context = { operation: name, ...options.context };
  if (status === null) {
    // Sin respuesta del servidor: red o funcion no desplegada.
    throw new AppError("network", "No se pudo conectar con el servidor. Probá de nuevo.", {
      context,
      cause: error,
    });
  }
  const kind = KIND_BY_STATUS[status] ?? "unknown";
  // 4xx: el mensaje lo escribimos nosotros en la Edge Function (en español, para el usuario).
  const userFacing = status < 500 && message ? message : FALLBACK;
  throw new AppError(kind, userFacing, { context, cause: error });
}
