import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";

import type { BatchesPageVm } from "./use-batches-page";

export function BatchesKpis({ summary }: Pick<BatchesPageVm, "summary">) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Programados</span>
          <Badge tone="neutral">est.</Badge>
        </div>
        <div className="font-mono text-xl font-semibold mt-1">
          {summary?.programados.cantidad ?? 0}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          {formatMoney(summary?.programados.monto ?? 0)}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Pendientes</span>
          <Badge tone="warn">Pend.</Badge>
        </div>
        <div className="font-mono text-xl font-semibold mt-1 text-amber-700">
          {summary?.pendientes.cantidad ?? 0}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          {formatMoney(summary?.pendientes.monto ?? 0)}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Acreditados (Mes)</span>
          <Badge tone="success">OK</Badge>
        </div>
        <div className="font-mono text-xl font-semibold mt-1 text-emerald-700">
          {summary?.acreditados.cantidad ?? 0}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          {formatMoney(summary?.acreditados.monto ?? 0)}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Contracargo</span>
          <Badge tone="danger">Disc.</Badge>
        </div>
        <div className="font-mono text-xl font-semibold mt-1 text-red-600">
          {summary?.contracargo.cantidad ?? 0}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          {formatMoney(summary?.contracargo.monto ?? 0)}
        </div>
      </Card>
    </div>
  );
}
