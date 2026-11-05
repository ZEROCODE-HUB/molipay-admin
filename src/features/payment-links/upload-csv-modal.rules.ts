import { type LinePreview } from "@/features/payment-links/credits.supabase";

export const RESULT: Record<
  LinePreview["resultado"],
  { texto: string; tone: "success" | "neutral" | "warn" | "danger" }
> = {
  importa: { texto: "Se importa", tone: "success" },
  ignora: { texto: "Se ignora", tone: "neutral" },
  excepcion: { texto: "Excepción", tone: "warn" },
  error: { texto: "Error", tone: "danger" },
};
