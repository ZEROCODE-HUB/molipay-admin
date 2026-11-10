import { Calendar, Store } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  SUBESTADO_TXT,
  esDelFile,
  fmtDateCorta,
  parseDateLocal,
  statusMostrado,
  tone,
} from "@/features/payment-links/batches.rules";

import type { BatchDetailVm } from "./use-batch-detail";

export function BatchInfoSection({
  batch,
  esInstallments,
}: Pick<BatchDetailVm, "batch" | "esInstallments">) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar size={12} /> {esDelFile(batch) ? "Fecha de pago Payway" : "Fecha estimada"}
        </div>
        <div className="font-mono font-semibold mt-1">
          {parseDateLocal(batch.fecha).toLocaleDateString("es-AR")}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          Acreditación:{" "}
          {batch.fechaAcreditacion ? (
            <>
              <span className="font-mono">{fmtDateCorta(batch.fechaAcreditacion)}</span>
              <Badge tone="success">real</Badge>
            </>
          ) : (
            <Badge tone="neutral">pendiente</Badge>
          )}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Store size={12} /> Comercio
        </div>
        <div className="font-semibold mt-1 truncate">
          {batch.comercio?.nombreComercio ?? batch.comercio?.usuario ?? "—"}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {batch.comercio?.legajo ?? batch.comercioId}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">Bandera</div>
        <div className="font-semibold mt-1">{batch.bandera}</div>
        <div className="text-xs text-muted-foreground">
          {esInstallments ? `${batch.cuotas} cuotas` : "Pago único"}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">Estado</div>
        <div className="mt-1">
          <Badge tone={tone(statusMostrado(batch))}>{statusMostrado(batch)}</Badge>
        </div>
        {batch.estado === "Pendiente" && batch.subestado && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {SUBESTADO_TXT[batch.subestado] ?? batch.subestado}
          </div>
        )}
        <div className="font-mono text-xs mt-1">{batch.cantidadOperaciones} ops</div>
      </Card>
    </div>
  );
}
