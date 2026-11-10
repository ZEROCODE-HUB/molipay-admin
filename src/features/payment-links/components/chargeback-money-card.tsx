import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { RETENTION_LABEL } from "@/features/payment-links/chargebacks.rules";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

import type { ChargebacksDetailVm } from "./use-chargebacks-detail";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Lo que pasa con la plata del comercio, separado de la disputa. */
export function ChargebackMoneyCard({ c, recupero }: Pick<ChargebacksDetailVm, "c" | "recupero">) {
  const r = recupero.data;
  const retention = RETENTION_LABEL[c.retencionEstado] ?? RETENTION_LABEL.no_aplica;

  return (
    <Card className="space-y-2 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Wallet size={12} /> Plata y lote
      </h4>
      {c.esSimulacion ? (
        <p className="text-sm text-muted-foreground">Sin efecto hasta confirmar la simulación.</p>
      ) : recupero.isPending ? (
        <div className="h-20 animate-pulse rounded-md bg-muted" />
      ) : (
        <>
          <Row label="Retención">
            <Badge tone={retention.tone}>{retention.label}</Badge>
          </Row>
          {c.retencionEstado === "pendiente" && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              Se retienen {formatMoney(c.importe)} al acreditar
              {r?.lote_venta_codigo ? ` el lote ${r.lote_venta_codigo}` : " el lote de la venta"}.
              No afecta a los otros lotes del comercio.
            </p>
          )}
          {r?.lote_venta_codigo && (
            <Row label="Lote de la venta">
              <span className="font-mono text-xs">{r.lote_venta_codigo}</span>
              {r.lote_venta_estado && (
                <span className="ml-1 text-xs text-muted-foreground">({r.lote_venta_estado})</span>
              )}
            </Row>
          )}
          {r && r.retenido_monto > 0 && (
            <Row label="Retenido al comercio">
              <span className="font-mono">{formatMoney(r.retenido_monto)}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                {r.retencion_lote_codigo ? `lote ${r.retencion_lote_codigo}` : "del saldo"}
              </span>
            </Row>
          )}
          <Row label="Descuento de Payway">
            {r?.lote_descuento_id ? (
              <Link
                to="/admin/comercios/link-pago/lotes"
                search={{ lote: r.lote_descuento_id }}
                className="font-mono text-xs text-primary hover:underline"
              >
                {r.lote_descuento_codigo}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Todavía no llegó en el archivo</span>
            )}
          </Row>
          {r && r.pendiente_recuperar > 0 && (
            <Row label="Deuda por recuperar">
              <span className="font-mono text-red-700">{formatMoney(r.pendiente_recuperar)}</span>
            </Row>
          )}
          {c.retencionEstado === "aplicado_payway" && (
            <p className="text-xs text-muted-foreground">
              Lo retenido cubrió el descuento de Payway: el comercio no paga dos veces.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
