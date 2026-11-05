import {
ADDRESS_DE_OPERATION,
type OperationTax,
type RatePrevista,
type SourceRate,
} from "@/infrastructure/supabase/legacy/types";
import { useQuery } from "@tanstack/react-query";
import { previewRateAssignment } from "@/features/taxes/taxes.supabase";
import { userMessage } from "@/shared/lib/errors";
import { formatValue } from "@/shared/lib/tax-format";
import { Info } from "lucide-react";
import { LEGAJO_RE,OPERATIONS_BY_ADDRESS } from "@/features/taxes/tax-users.rules";

/**
 * Que se le va a cobrar con esta asignacion, por direccion. La alicuota la
 * resuelve la base (tax_rate_preview): tax_rates en impuestos fijos, padron
 * vigente por CUIT en IIBB. En manual se muestra la alicuota del formulario.
 */
export function PrevisionRate({
  clienteLegajo: customerLegajo,
  impuestoId: taxId,
  fuente: source,
  operacion: operation,
  manual,
}: {
  clienteLegajo: string;
  impuestoId: string;
  fuente: SourceRate;
  operacion: OperationTax | null;
  manual: string | null;
}) {
  const habilitado = LEGAJO_RE.test(customerLegajo) && taxId !== "" && source !== "Manual";
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tax_rate_preview", customerLegajo, taxId],
    queryFn: () => previewRateAssignment(customerLegajo, taxId),
    enabled: habilitado,
    staleTime: 60_000,
  });

  const addresses: ("Entrante" | "Saliente")[] = operation
    ? [ADDRESS_DE_OPERATION[operation]]
    : ["Entrante", "Saliente"];

  const value = (d: "Entrante" | "Saliente") => {
    if (source === "Manual")
      return manual ? <span className="font-mono">{manual}</span> : "Indicá la alícuota";
    if (!habilitado) return <span className="text-muted-foreground">Elegí el comercio</span>;
    if (isLoading) return <span className="text-muted-foreground">Consultando…</span>;
    if (isError) return <span className="text-red-600">{userMessage(error)}</span>;
    const p = data?.find((x: RatePrevista) => x.direccion === d);
    if (!p) return "—";
    if (p.valor <= 0)
      return (
        <span>
          <span className="font-mono">0%</span>
          {p.nota && <span className="text-muted-foreground"> · {p.nota}</span>}
        </span>
      );
    return (
      <span>
        <span className="font-mono font-semibold">{formatValue(p)}</span>
        {p.codigo && <span className="text-muted-foreground font-mono"> · {p.codigo}</span>}
      </span>
    );
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Info size={12} /> Qué se le va a cobrar
      </div>
      <ul className="mt-2 space-y-1.5">
        {addresses.map((d) => (
          <li key={d} className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              {d === "Entrante" ? "Pay-In" : "Pay-Out"}
              <span className="text-xs text-muted-foreground">
                {" "}
                ({(operation ? [operation] : OPERATIONS_BY_ADDRESS[d]).join(", ")})
              </span>
            </span>
            <span className="text-right">{value(d)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {source === "Padrón"
          ? "IIBB toma la alícuota del padrón vigente por el CUIT del comercio; si no figura, es exento o no sujeto, es 0%."
          : source === "Fija"
            ? "Sale de las alícuotas del impuesto (Impuestos › detalle). Si cambian por ley, se actualizan ahí."
            : "Impuesto manual: la alícuota es propia de esta asignación."}
      </p>
    </div>
  );
}
