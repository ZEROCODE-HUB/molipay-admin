import { type PreviewSettlement } from "@/features/payment-links/credits.supabase";
import { Badge } from "@/shared/ui/badge";
import { type ReactNode } from "react";
import { type Step } from "@/features/payment-links/settlements.types";

export function Steps({ paso: step }: { paso: Step }) {
  const names = ["Archivo", "Vista previa", "Confirmación", "Resultado"];
  return (
    <ol className="flex flex-wrap items-center gap-2 mb-4 text-xs">
      {names.map((n, i) => {
        const k = (i + 1) as Step;
        const active = k === step;
        const hecho = k < step;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : hecho
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "text-muted-foreground"
              }`}
            >
              {k}
            </span>
            <span className={active ? "font-semibold" : "text-muted-foreground"}>{n}</span>
            {k < 4 && <span className="text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function StatusImportacion({ estado: status }: { estado: PreviewSettlement["estado"] }) {
  if (status === "lista_para_confirmar") return <Badge tone="success">Lista para confirmar</Badge>;
  if (status === "con_errores")
    return <Badge tone="danger">Con errores (no se puede confirmar)</Badge>;
  return <Badge tone="danger">Archivo ya importado</Badge>;
}

export function Dato({
  label,
  v,
  tone,
}: {
  label: string;
  v: ReactNode;
  tone?: "warn" | "danger";
}) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${tone === "danger" ? "border-red-300" : tone === "warn" ? "border-amber-300" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{v}</div>
    </div>
  );
}
