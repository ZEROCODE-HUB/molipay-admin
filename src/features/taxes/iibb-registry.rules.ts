import { type StatusRegistry } from "@/infrastructure/supabase/legacy/types";
import { downloadText } from "@/shared/lib/download";
import { listErrorsRegistry, type RegistryIibb } from "@/features/taxes/iibb-registry.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";

export const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("es-AR");
export const pct = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
export const date = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";

export function toneStatus(e: StatusRegistry): "success" | "warn" | "danger" | "neutral" {
  if (e === "Vigente") return "success";
  if (e === "Borrador" || e === "Cargando" || e === "Procesando") return "warn";
  if (e === "Error") return "danger";
  return "neutral";
}

export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const csv = rows
    .map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  downloadText(name, "﻿" + csv, "text/csv;charset=utf-8");
}

export async function downloadErrors(p: RegistryIibb) {
  try {
    const errs = await listErrorsRegistry(p.id);
    if (errs.length === 0) return toast.info("El padrón no tiene filas con error.");
    downloadCsv(`errores-${p.nombre.replace(/\s+/g, "-")}.csv`, [
      ["Línea", "Motivo", "Contenido"],
      ...errs.map((e) => [e.linea, e.motivo, e.contenido]),
    ]);
    if (p.filasError > errs.length)
      toast.info(
        `Se descargaron ${n(errs.length)} de ${n(p.filasError)} errores (el detalle se guarda hasta 5.000).`,
      );
  } catch (e) {
    toast.error(userMessage(e));
  }
}
