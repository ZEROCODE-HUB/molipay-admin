import { fmtPct } from "@/shared/lib/fee-schedule";
import { FormDialog } from "@/shared/ui/form-dialog";
import { LegajoCell } from "@/shared/ui/legajo-label";
import { configLabel,desgloseDe } from "@/features/customers/customer-fees.rules";
import { DesglosePreview } from "./customer-fees-parts";

import type { CustomerFeesPageVm } from "./use-customer-fees-page";

export function CustomerFeeDetailDialog({
  viewing,
  setViewing,
}: Pick<CustomerFeesPageVm, "viewing" | "setViewing">) {
  return (
    <>
      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de comisión"
          description={`Comisión ${viewing.legajo} — ${viewing.operacion}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <LegajoCell legajo={viewing.legajo} />
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CUIT:</span>{" "}
              <span className="font-mono tabular-nums">{viewing.cuit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CVU:</span>{" "}
              {viewing.cvu ? (
                <span className="font-medium font-mono tabular-nums">{viewing.cvu}</span>
              ) : (
                <span className="font-medium">Toda la cuenta (respaldo del cliente)</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Tipo de operación:</span>{" "}
              <span className="font-medium">{viewing.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Código de operación:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{viewing.operacion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modalidad:</span>{" "}
              <span className="font-medium">{viewing.modalidad}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Configuración:</span>{" "}
              <span className="font-medium font-mono tabular-nums">{configLabel(viewing)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">% Impuesto (IVA):</span>{" "}
              <span className="font-medium font-mono tabular-nums">
                {fmtPct(viewing.porcentajeImpuesto)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">
                {viewing.estado === "Habilitado" ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Descripción:</span>{" "}
              <span className="font-medium">{viewing.descripcion}</span>
            </div>
            <div className="col-span-2">
              <DesglosePreview desglose={desgloseDe(viewing)} />
            </div>
          </div>
        </FormDialog>
      )}
    </>
  );
}
