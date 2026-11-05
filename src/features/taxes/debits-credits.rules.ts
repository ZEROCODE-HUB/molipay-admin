import { type SituacionExemption,urlCertificate } from "@/features/taxes/exemptions.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";

export const PAGE_SIZE = 10;

export const dateHour = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Sin fecha";

export const TONE_SITUACION: Record<SituacionExemption, "success" | "warn" | "danger" | "neutral"> =
  {
    Vigente: "success",
    Programada: "warn",
    Vencida: "danger",
    Inactiva: "neutral",
  };

/** datetime-local (hora local) -> ISO; vacio -> null. */
export const localAIso = (v: string) => (v ? new Date(v).toISOString() : null);

export async function openCertificate(path: string) {
  try {
    window.open(await urlCertificate(path), "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error(userMessage(err));
  }
}
