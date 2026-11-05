import { type BlockScope } from "@/features/regulatory-reports/compliance.supabase";

/** Clave de cache compartida de bloqueos. */
export const BLOCKS_QUERY_KEY = ["account_blocks"] as const;

export const PAGE_SIZES = [10, 20, 50];
export const STATUS_LABEL = { active: "Bloqueado", released: "Desbloqueado" } as const;
export const COMPLIANCE_LABEL = { pending: "Pendiente", accepted: "Aceptado" } as const;
export const SCOPE_LABEL: Record<BlockScope, string> = {
  client: "Toda la cuenta",
  subaccount: "Subcuenta",
};

export const invertir = <K extends string>(m: Record<K, string>) =>
  new Map(Object.entries(m).map(([k, v]) => [v as string, k as K]));
export const STATUS_BY_LABEL = invertir(STATUS_LABEL);
export const COMPLIANCE_BY_LABEL = invertir(COMPLIANCE_LABEL);
export const SCOPE_BY_LABEL = invertir(SCOPE_LABEL);
