/**
 * Cliente front para los endpoints de BDC (CVU) del backend.
 *
 * El browser SIEMPRE pega contra el backend (`molipay-back`) y NUNCA contra
 * BDC directo. Razones:
 *   1. Las credenciales de BDC (API key, signing secret) viven solo en el
 *      servidor. No deben terminar en el bundle del admin.
 *   2. El backend valida CUIT/alias server-side antes de salir a BDC.
 *   3. El backend normaliza errores HTTP -> codigos semanticos. El cliente
 *      solo conoce la taxonomia de `BdcErrorCode`.
 *
 * Si la BDC_STUB_MODE del backend esta activa, esto sigue funcionando
 * porque el backend devuelve CVUs locales validos. En dev local no hay
 * que cambiar nada.
 */

import { env } from "@/lib/env";

export type SubcuentaTipo = "Operativa" | "Recaudacion" | "Garantias" | "Sueldos";

/**
 * Taxonomia de errores BDC.
 *
 * Misma que la del backend (`BdcError["code"]`). La duplicamos en el
 * cliente porque (a) la taxonomia es corta y estable, (b) evita un `import`
 * cross-repo entre admin y backend. Si agregas un codigo nuevo, agregalo
 * en los dos lados.
 */
export type BdcErrorCode =
  | "alias_taken"
  | "cuit_invalid"
  | "auth_failed"
  | "rate_limited"
  | "timeout"
  | "server_error"
  | "not_configured"
  | "unknown";

export class BdcError extends Error {
  constructor(
    message: string,
    public readonly code: BdcErrorCode,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "BdcError";
  }
}

/**
 * Resultado de asignar una CVU. Pensado para que el front siempre tenga un
 * shape tipado. Si quisieras distinguir error de exito aca (en vez de tirar),
 * reemplazalo por un Result<...>. Por ahora, error-throw es mas limpio en TS.
 */
export type AssignCvuResult = {
  cvu: string;
  alias: string;
  /** ID devuelto por BDC/COELSA, util para trazabilidad. */
  originId?: string;
  /** true si vino del stub local del backend, false si vino de BDC real. */
  stub: boolean;
};

export type CheckAliasResult =
  | { disponible: true }
  | { disponible: false; motivo?: string };

const isMissingBackendConfig = !env.BACKEND_URL;

// ============================================================================
// Helpers
// ============================================================================

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (isMissingBackendConfig) {
    throw new BdcError(
      "Backend no configurado: BACKEND_URL no definido. Defini REACT_APP_BACKEND_URL (o similar) en .env.",
      "not_configured",
    );
  }
  let res: Response;
  try {
    res = await fetch(`${env.BACKEND_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Si en el futuro el backend exige auth de Supabase, esto seria el
        // header `Authorization: Bearer <jwt>` que sacas de useAuth().
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new BdcError(
      `No pude conectar con el backend: ${(e as Error).message}`,
      "server_error",
    );
  }
  return parseBdcResponse<T>(res, path);
}

async function parseBdcResponse<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  if (res.ok) {
    if (typeof parsed !== "object" || parsed === null) {
      throw new BdcError(`Respuesta invalida de ${path}`, "server_error", res.status);
    }
    const body = parsed as { ok?: unknown } & Record<string, unknown>;
    if (body.ok !== true) {
      throw new BdcError(
        `Backend devolvio ok=false en ${path}`,
        "server_error",
        res.status,
      );
    }
    return body as T;
  }
  // Error tipado del backend.
  const code =
    typeof parsed === "object" && parsed !== null && "code" in parsed
      ? (parsed as { code: string }).code
      : "unknown";
  const message =
    typeof parsed === "object" && parsed !== null && "message" in parsed
      ? String((parsed as { message: unknown }).message)
      : `Error ${res.status} al llamar ${path}`;
  throw new BdcError(
    message,
    (code as BdcErrorCode) ?? "unknown",
    res.status,
  );
}

// ============================================================================
// API publica (la consume el front)
// ============================================================================

export async function checkAlias(alias: string): Promise<CheckAliasResult> {
  return postJson<CheckAliasResult>("/api/bdc/check-alias", { alias });
}

export async function assignCvu(input: {
  cuit: string;
  alias?: string;
  titularNombre: string;
  tipo: SubcuentaTipo;
  /** UUID generado del lado del cliente para idempotencia. */
  idempotencyKey: string;
  /** Legajo del cliente (LPF-/LPJ-CUIT). Se envia al backend para auditar. */
  legajo: string;
  /** Que front pidio esto. Default 'admin'. */
  origin?: "admin" | "enterprise";
}): Promise<AssignCvuResult> {
  const body = {
    cuit: input.cuit,
    alias: input.alias,
    titularNombre: input.titularNombre,
    tipo: input.tipo,
    idempotencyKey: input.idempotencyKey,
    legajo: input.legajo,
    origin: input.origin ?? "admin",
  };
  type Resp = AssignCvuResult;
  return postJson<Resp>("/api/bdc/assign-cvu", body);
}

/**
 * Mensajes humanos para mostrar al operador en cada codigo.
 *
 * El frontend no debe inventar estos textos: ya vienen del backend en el
 * `message` del BdcError. Esta funcion es solo un fallback si la respuesta
 * viene sin message o sin code.
 */
export function bdcErrorToToastMessage(code: BdcErrorCode, fallback: string): string {
  switch (code) {
    case "alias_taken":
      return "Ese alias ya existe en otra billetera o banco. Probá con otro.";
    case "cuit_invalid":
      return "El CUIT del cliente no es válido para COELSA. Verificá los datos fiscales.";
    case "auth_failed":
      return "No pudimos autenticarnos con BDC Conecta. Avisá a Compliance.";
    case "rate_limited":
      return "BDC rechazó la operación por rate limit. Reintentá en unos minutos.";
    case "timeout":
      return "BDC Conecta no respondió a tiempo. Lo intentamos de nuevo en unos segundos.";
    case "not_configured":
      return "El backend no tiene configuradas las credenciales de BDC. Contactá a infra.";
    case "server_error":
      return fallback;
    case "unknown":
    default:
      return fallback;
  }
}
