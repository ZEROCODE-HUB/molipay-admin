import { type ReactNode } from "react";

export type StatusPeriod = "Sin generar" | "Incompleto" | "Completo" | "Presentado";

/* ---------- Vista previa ---------- */

export type ColPreview = {
  key: string;
  label: string;
  hint: string;
  align?: "right";
  render?: (r: Record<string, unknown>) => ReactNode;
};
