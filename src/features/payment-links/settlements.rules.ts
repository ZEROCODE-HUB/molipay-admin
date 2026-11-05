import { type LinePreview } from "@/features/payment-links/credits.supabase";

export const RESULT_LABEL: Record<LinePreview["resultado"], string> = {
  importa: "Se importa",
  ignora: "Se ignora",
  excepcion: "Excepción",
  error: "Error",
};
export const RESULT_TONE: Record<
  LinePreview["resultado"],
  "success" | "neutral" | "warn" | "danger"
> = {
  importa: "success",
  ignora: "neutral",
  excepcion: "warn",
  error: "danger",
};
