import { Modal } from "@/shared/ui/modal";
import { type ReactNode } from "react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { type Tax } from "@/features/regulatory-reports/reports.types";

export function TaxDetailModal({
  impuesto: tax,
  onClose,
  onMarcarPresentado: onMarkFiled,
  onMarcarPagado: onMarkPaid,
}: {
  impuesto: Tax;
  onClose: () => void;
  onMarcarPresentado: (id: string) => void;
  onMarcarPagado: (id: string) => void;
}) {
  const Field = ({ label, value }: { label: string; value: ReactNode }) => (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display font-semibold text-lg">Detalle del reporte</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{tax.reporte}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información del reporte
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="ID" value={<span className="font-mono">{tax.id}</span>} />
              <Field label="Reporte" value={tax.reporte} />
              <Field label="Período" value={tax.periodo} />
              <Field label="Tramo" value={tax.tramo} />
              <Field
                label="Fecha de creación"
                value={<span className="font-mono tabular-nums">{tax.creado}</span>}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              KPIs
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="Total de registros" value={tax.totalRegistros} />
              <Field label="Total de movimientos" value={tax.totalMovimientos} />
              <Field
                label="Total de monto"
                value={<span className="font-mono">{tax.totalMonto}</span>}
              />
              <Field
                label="Total de retenciones"
                value={<span className="font-mono">{tax.totalRetenciones}</span>}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Estado
            </h4>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Presentado
                </div>
                <div className="mt-1">
                  <Badge tone={tax.presentado === "Sí" ? "success" : "danger"}>
                    {tax.presentado}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Pagado</div>
                <div className="mt-1">
                  <Badge tone={tax.pagado === "Sí" ? "success" : "danger"}>{tax.pagado}</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex flex-wrap justify-end gap-2">
          {tax.presentado === "No" && (
            <BtnPrimary className="h-9 text-sm" onClick={() => onMarkFiled(tax.id)}>
              Marcar como presentado
            </BtnPrimary>
          )}
          {tax.pagado === "No" && (
            <BtnOutline className="h-9 text-sm" onClick={() => onMarkPaid(tax.id)}>
              Marcar como pagado
            </BtnOutline>
          )}
          <BtnOutline className="h-9 text-sm" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
