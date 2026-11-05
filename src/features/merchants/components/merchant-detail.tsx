import { Modal } from "@/shared/ui/modal";
import { type Merchant } from "@/infrastructure/supabase/legacy/types";
import { XCircle } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { Badge } from "@/shared/ui/badge";
import { MOCK_TAXES_BY_COLLECT,formatTaxAmount } from "@/features/taxes/receivable-taxes.data";
import { BtnOutline } from "@/shared/ui/button";
import { Field } from "@/shared/ui/labeled-field";
import { statusBadgeTone } from "@/features/merchants/merchants.rules";
import { BrandsSection } from "./brands-section";

export function MerchantDetail({
  comercio: merchant,
  onClose,
}: {
  comercio: Merchant;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-5xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de comercio</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {merchant.usuario} · {merchant.legajo}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {merchant.estado === "Pendiente de aprobación" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Comercio pendiente de aprobación</p>
              <p className="text-xs mt-1">
                Este comercio no puede operar hasta que se le asigne CVU y comisión. El estado
                actual no permite transacciones ni acreditaciones.
              </p>
            </div>
          )}

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Usuario" value={merchant.usuario} />
              <Field
                label="Legajo"
                value={
                  <span className="inline-flex items-center gap-1">
                    <LegajoCell legajo={merchant.legajo} />
                  </span>
                }
              />
              <Field label="Nombre del comercio" value={merchant.nombreComercio ?? "—"} />
              <Field label="Cliente" value={merchant.cliente?.nombre ?? "—"} />
              <Field
                label="CUIT del cliente"
                value={
                  <span className="font-mono tabular-nums text-xs">
                    {merchant.cliente?.cuit ?? "—"}
                  </span>
                }
              />
              <Field
                label="Categoría"
                value={
                  merchant.categoria ? (
                    <span className="font-mono tabular-nums">
                      {merchant.categoria.codigo} · {merchant.categoria.nombre}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Nivel" value={merchant.nivel} />
              <Field
                label="site_id (Payway)"
                value={<span className="font-mono text-xs">{merchant.siteId ?? "—"}</span>}
              />
              <Field
                label="Estado"
                value={<Badge tone={statusBadgeTone(merchant.estado)}>{merchant.estado}</Badge>}
              />
              <Field
                label="Fecha de registro"
                value={
                  <span className="font-mono text-xs tabular-nums">
                    {new Date(merchant.createdAt).toLocaleDateString("es-AR")}
                  </span>
                }
              />
            </div>
          </Card>

          <BrandsSection comercioId={merchant.id} />

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Impuestos por pagar — lote de acreditación
            </h4>
            {(() => {
              const byCollect = MOCK_TAXES_BY_COLLECT.filter(
                (r) => r.legajo === merchant.legajo && r.estado === "pendiente",
              );
              const byBatch = new Map<string, { total: number; count: number }>();
              for (const r of byCollect) {
                const cur = byBatch.get(r.loteId) ?? { total: 0, count: 0 };
                cur.total += r.monto;
                cur.count += 1;
                byBatch.set(r.loteId, cur);
              }
              const total = byCollect.reduce((a, b) => a + b.monto, 0);
              if (byCollect.length === 0) {
                return (
                  <div className="text-sm text-muted-foreground">
                    Sin impuestos pendientes para este comercio según lotes de acreditación.
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-mono font-semibold tabular-nums">
                      {formatTaxAmount(total)}
                    </div>
                    <Badge tone="warn">Por pagar</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Suma real de impuestos pendientes agrupada por lote de acreditación
                  </div>
                  <div className="space-y-1.5">
                    {Array.from(byBatch.entries()).map(([batchId, v]) => (
                      <div
                        key={batchId}
                        className="flex justify-between text-sm border rounded px-3 py-1.5 bg-muted/30"
                      >
                        <span className="font-mono text-xs">
                          {batchId} · {v.count} impuesto(s)
                        </span>
                        <span className="font-mono font-semibold">{formatTaxAmount(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card className="p-0">
            <div className="px-5 pt-5 pb-1">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen
              </h4>
            </div>
            <div className="px-5 pb-5 pt-3 text-sm text-muted-foreground">
              Los puntos de venta / QR se gestionan en{" "}
              <span className="font-semibold">Pagos con QR</span> y los enlaces en{" "}
              <span className="font-semibold">Enlaces de pago</span>.
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
