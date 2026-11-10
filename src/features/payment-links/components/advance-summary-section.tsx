import { formatMoney } from "@/shared/lib/format";
import { Building2, Calendar, Clock } from "lucide-react";
import { Card } from "@/shared/ui/card";

import type { DetailVm } from "./use-advance-detail";

export function AdvanceSummarySection({ a }: Pick<DetailVm, "a">) {
  return (
    <Card className="p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Solicitud
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground flex items-center gap-1">
            <Building2 size={12} /> Comercio
          </span>
          <div className="font-semibold truncate">{a.comercio}</div>
          <div className="font-mono text-xs text-muted-foreground">{a.legajo}</div>
        </div>
        <div>
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar size={12} /> Fecha solicitud
          </span>
          <div className="font-mono">{a.fechaSolicitud}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Importe solicitado</span>
          <div className="font-mono font-semibold text-base">
            {formatMoney(a.importeSolicitado)}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock size={12} /> Plazo solicitado
          </span>
          <div className="font-semibold">{a.plazoSolicitado}</div>
          <div className="text-xs text-muted-foreground">Contractual: {a.plazoContractual}</div>
        </div>
        {a.motivo && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Motivo</span>
            <div className="text-sm whitespace-pre-wrap">{a.motivo}</div>
          </div>
        )}
        {a.montoOfertado != null && (
          <div>
            <span className="text-muted-foreground">Oferta</span>
            <div className="font-mono font-semibold">
              {formatMoney(a.montoOfertado)} al {a.tasaInteresPct ?? 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              Neto a recibir: <span className="font-mono">{formatMoney(a.netoARecibir ?? 0)}</span>
            </div>
          </div>
        )}
        {a.rechazoMotivo && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Motivo del rechazo</span>
            <div className="text-sm whitespace-pre-wrap">{a.rechazoMotivo}</div>
          </div>
        )}
        {a.fechaResolucion && (
          <div>
            <span className="text-muted-foreground">Fecha resolución</span>
            <div className="font-mono text-xs">{a.fechaResolucion}</div>
          </div>
        )}
        {a.fechaAcreditacion && (
          <div>
            <span className="text-muted-foreground">Fecha acreditación</span>
            <div className="font-mono text-xs">{a.fechaAcreditacion}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
