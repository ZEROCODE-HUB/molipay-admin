import type { AppErrorContext } from "@/shared/lib/errors";
import { requireSupabase } from "./client";
import { toAppError } from "./errors";

/** Llama una RPC y convierte el error en AppError. `signal` cancela la consulta (TanStack Query). */
export async function callRpc<T>(
  name: string,
  params: Record<string, unknown> = {},
  options: { signal?: AbortSignal; context?: AppErrorContext } = {},
): Promise<T> {
  let request = requireSupabase().rpc(name, params);
  if (options.signal) request = request.abortSignal(options.signal);
  const { data, error } = await request;
  if (error) throw toAppError(error, { operation: name, ...options.context });
  return data as T;
}
