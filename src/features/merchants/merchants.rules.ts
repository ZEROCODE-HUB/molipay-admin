import { type StatusMerchant } from "@/infrastructure/supabase/legacy/types";

export const PAGE_SIZES = [10, 20, 50];

export function statusBadgeTone(status: StatusMerchant): "success" | "neutral" | "warn" | "danger" {
  if (status === "Activado") return "success";
  if (status === "Desactivado") return "neutral";
  if (status === "Rechazado") return "danger";
  return "warn";
}

export function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}
