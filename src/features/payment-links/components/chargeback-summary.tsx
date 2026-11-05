import { toast } from "sonner";
import { Banknote,Copy,CreditCard } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";

import type { ChargebacksDetailVm } from "./use-chargebacks-detail";

export function ChargebackSummary({ c }: Pick<ChargebacksDetailVm, "c">) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Banknote size={12} /> Contracargo
        </h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Importe</span>
            <div className="font-mono font-semibold text-lg text-red-600">
              -{formatMoney(c.importe)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Fecha creación</span>
            <div className="font-mono text-xs">{new Date(c.createdAt).toLocaleString("es-AR")}</div>
          </div>
          {c.fechaTransaccion && (
            <div>
              <span className="text-muted-foreground">Fecha transacción</span>
              <div className="font-mono text-xs">
                {new Date(c.fechaTransaccion).toLocaleString("es-AR")}
              </div>
            </div>
          )}
          {c.motivoPayway && (
            <div>
              <span className="text-muted-foreground">Motivo</span>
              <div className="text-sm">{c.motivoPayway}</div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <CreditCard size={12} /> Datos PayWay
        </h4>
        <div className="space-y-2 text-sm">
          {c.nroTarjetaMasked && (
            <div>
              <span className="text-muted-foreground">Tarjeta</span>
              <div className="font-mono">
                {c.nroTarjetaMasked}
                {c.marcaTarjeta && (
                  <span className="ml-2 text-xs text-muted-foreground">({c.marcaTarjeta})</span>
                )}
              </div>
            </div>
          )}
          {c.siteTransactionId && (
            <div>
              <span className="text-muted-foreground">TID</span>
              <div className="font-mono text-xs flex items-center gap-1">
                {c.siteTransactionId}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(c.siteTransactionId!);
                    toast.success("Copiado");
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  <Copy size={10} />
                </button>
              </div>
            </div>
          )}
          {c.siteId && (
            <div>
              <span className="text-muted-foreground">Establecimiento</span>
              <div className="font-mono text-xs">{c.siteId}</div>
            </div>
          )}
          {c.ccoOrigen && (
            <div>
              <span className="text-muted-foreground">Origen (CCO)</span>
              <div className="text-xs">{c.ccoOrigen}</div>
            </div>
          )}
          {c.ticketPayway && (
            <div>
              <span className="text-muted-foreground">Ticket PayWay</span>
              <div className="font-mono text-xs">{c.ticketPayway}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
