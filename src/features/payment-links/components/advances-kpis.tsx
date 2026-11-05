import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";

import type { AdvancesPageVm } from "./use-advances-page";

export function AdvancesKpis({ poolCabecera }: Pick<AdvancesPageVm, "poolCabecera">) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Pendiente de acreditar (recaudadora Payway)
        </div>
        <div className="font-mono text-2xl font-semibold mt-1">
          {poolCabecera ? formatMoney(poolCabecera.poolRecaudacionTotal) : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          Lo que Payway ya depositó y todavía no es saldo de ningún comercio. Es la única fuente de
          fondeo para los adelantos.
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Adelantos en curso
        </div>
        <div className="font-mono text-2xl font-semibold mt-1">
          {poolCabecera ? formatMoney(poolCabecera.adelantosEnCurso) : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          Adelantos acreditados que todavía no se compensaron con los lotes del comercio.
        </div>
      </Card>
      <Card
        className={
          "p-4 border-l-4 " +
          ((poolCabecera?.cupoDisponiblePool ?? 0) <= 0
            ? "border-l-red-500"
            : (poolCabecera?.cupoDisponiblePool ?? 0) < 10000
              ? "border-l-amber-500"
              : "border-l-emerald-500")
        }
      >
        <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-between">
          <span>Cupo disponible del pool</span>
          {(poolCabecera?.cupoDisponiblePool ?? 0) <= 0 && (
            <span className="text-red-600 font-semibold">⚠ Sin liquidez</span>
          )}
        </div>
        <div
          className={
            "font-mono text-2xl font-semibold mt-1 " +
            ((poolCabecera?.cupoDisponiblePool ?? 0) <= 0
              ? "text-red-600"
              : (poolCabecera?.cupoDisponiblePool ?? 0) < 10000
                ? "text-amber-700"
                : "text-emerald-700")
          }
        >
          {poolCabecera ? formatMoney(poolCabecera.cupoDisponiblePool) : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          Pendiente de acreditar − adelantos sin compensar. Define si se puede seguir acreditando
          adelantos.
        </div>
      </Card>
    </div>
  );
}
