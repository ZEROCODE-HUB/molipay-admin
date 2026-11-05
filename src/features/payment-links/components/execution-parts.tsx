import { type ReactNode } from "react";
import { type Step } from "@/features/payment-links/execution.types";

export function GrupoRows({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Steps({ paso: step }: { paso: Step }) {
  const names = ["Selección", "Revisión", "Confirmación", "Resultados"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {names.map((n, i) => {
        const k = (i + 1) as Step;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                k === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : k < step
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "text-muted-foreground"
              }`}
            >
              {k}
            </span>
            <span className={k === step ? "font-semibold" : "text-muted-foreground"}>{n}</span>
            {k < 4 && <span className="text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function Line({ l, v }: { l: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{l}</span>
      <span>{v}</span>
    </div>
  );
}
