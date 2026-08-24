import { isNotConfiguredError, isPermissionError, toDataError } from "@/lib/supabase";

/**
 * Error tipado de la capa de acceso a datos. Distingue tres situaciones que la UI
 * debe tratar de forma diferente:
 *  - `permission`: la consulta fue bloqueada por RLS / política (≠ "no hay datos").
 *  - `notConfigured`: Supabase no está configurado en el entorno.
 *  - error genérico de red / Postgres.
 */
export class DataAccessError extends Error {
  permission: boolean;
  notConfigured: boolean;
  code: string | null;
  details: string | null;

  constructor(err: unknown) {
    const e = toDataError(err);
    super(e.message);
    this.name = "DataAccessError";
    this.code = e.code;
    this.details = e.details ?? null;
    this.permission = isPermissionError(err);
    this.notConfigured = isNotConfiguredError(err);
  }
}
