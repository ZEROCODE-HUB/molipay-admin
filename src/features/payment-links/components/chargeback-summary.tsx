import { toast } from "sonner";
import { Copy, CreditCard } from "lucide-react";
import { ORIGIN_LABEL } from "@/features/payment-links/chargebacks.rules";
import { formatMoney } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";

import type { ChargebacksDetailVm } from "./use-chargebacks-detail";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

/** La venta reclamada y lo que informó Payway. */
export function ChargebackSummary({ c }: Pick<ChargebacksDetailVm, "c">) {
  return (
    <Card className="space-y-2 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <CreditCard size={12} /> Disputa
      </h4>
      <Row label="Importe reclamado">
        <span className="font-mono font-semibold text-red-600">-{formatMoney(c.importe)}</span>
      </Row>
      {c.siteTransactionId ? (
        <Row label="Venta (ID Payway)">
          <span className="inline-flex items-center gap-1 font-mono text-xs">
            <span className="truncate">{c.siteTransactionId}</span>
            <button
              type="button"
              aria-label="Copiar ID"
              onClick={() => {
                void navigator.clipboard.writeText(c.siteTransactionId!);
                toast.success("Copiado");
              }}
              className="rounded p-0.5 hover:bg-muted"
            >
              <Copy size={10} />
            </button>
          </span>
        </Row>
      ) : (
        <Row label="Venta">
          <span className="text-xs text-amber-700">Sin identificar</span>
        </Row>
      )}
      {c.fechaTransaccion && (
        <Row label="Fecha de la venta">
          <span className="font-mono text-xs">
            {new Date(c.fechaTransaccion).toLocaleString("es-AR")}
          </span>
        </Row>
      )}
      {(c.nroTarjetaMasked || c.marcaTarjeta) && (
        <Row label="Tarjeta">
          <span className="font-mono text-xs">
            {c.nroTarjetaMasked ?? ""} {c.marcaTarjeta && `(${c.marcaTarjeta})`}
          </span>
        </Row>
      )}
      {c.motivoPayway && (
        <Row label="Motivo">
          <span className="text-xs">{c.motivoPayway}</span>
        </Row>
      )}
      {c.ccoOrigen && (
        <Row label="Origen del reclamo">
          <span className="text-xs">{c.ccoOrigen}</span>
        </Row>
      )}
      <Row label="Llegó por">
        <span className="text-xs">
          {(c.origen && ORIGIN_LABEL[c.origen]) ?? "—"} ·{" "}
          {new Date(c.createdAt).toLocaleDateString("es-AR")}
        </span>
      </Row>
    </Card>
  );
}
