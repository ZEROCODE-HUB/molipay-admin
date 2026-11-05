import { type Draft } from "./block-settings.types";

export const PAGE_SIZES = [10, 20, 50];
export const RULE_GLOBAL = "deposit_min_wages_block";

export const empty: Draft = { legajo: "", correo: "", persona: "", empresa: "" };

/** Entero >= 0 o vacío (= usa el general). */
export function readUmbral(
  v: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = v.trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, error: "Ingresá un número" };
  if (n < 0) return { ok: false, error: "No puede ser negativo" };
  if (!Number.isInteger(n)) return { ok: false, error: "Debe ser un número entero" };
  return { ok: true, value: n };
}

export const fmtUmbral = (v: number | null) => (v == null ? "General" : String(v));
