import type { Rate,SourceRate } from "@/infrastructure/supabase/legacy/types";
import { LABEL_ADDRESS,formatValue,effectiveToday } from "@/shared/lib/tax-format";

/**
 * Alicuotas vigentes hoy, segun la fuente del impuesto. `direccion` filtra las
 * que aplican a una sola direccion (las de "Ambas" siempre aplican).
 */
export function SummaryRate({
  fuente: source,
  alicuotas: rates,
  direccion: address,
}: {
  fuente: SourceRate;
  alicuotas: Rate[];
  direccion?: "Entrante" | "Saliente";
}) {
  if (source === "Padrón")
    return (
      <span className="text-xs text-muted-foreground">
        {address === "Saliente" ? "0% (el padrón solo aplica a Pay-In)" : "Según padrón"}
      </span>
    );
  if (source === "Manual")
    return <span className="text-xs text-muted-foreground">Por cliente</span>;
  const effectives = rates
    .filter(effectiveToday)
    .filter((a) => !address || a.direccion === address || a.direccion === "Ambas");
  if (effectives.length === 0)
    return <span className="text-xs text-amber-700">Sin alícuota vigente</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {effectives.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
          title={`${a.codigo} · ${LABEL_ADDRESS[a.direccion]}`}
        >
          {formatValue(a)}
          {a.direccion !== "Ambas" && (
            <span className="text-muted-foreground">
              {a.direccion === "Entrante" ? "IN" : "OUT"}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
