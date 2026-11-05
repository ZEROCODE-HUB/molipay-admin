import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";

import type { BrandsSectionVm } from "./use-brands-section";

export function InstallmentFormDialog({
  showInstallmentForm,
  setShowInstallmentForm,
  installmentsBrand,
  saveInstallment,
  savingInstallment,
  installmentValue,
  setInstallmentValue,
  installmentRate,
  setInstallmentRate,
  installmentStatus,
  setInstallmentStatus,
}: Pick<
  BrandsSectionVm,
  | "showInstallmentForm"
  | "setShowInstallmentForm"
  | "installmentsBrand"
  | "saveInstallment"
  | "savingInstallment"
  | "installmentValue"
  | "setInstallmentValue"
  | "installmentRate"
  | "setInstallmentRate"
  | "installmentStatus"
  | "setInstallmentStatus"
>) {
  return (
    <>
      {showInstallmentForm && (
        <FormDialog
          open
          onClose={() => setShowInstallmentForm(false)}
          title={`Agregar cuota a ${installmentsBrand?.bandera}`}
          onSubmit={saveInstallment}
          submitLabel={savingInstallment ? "Guardando…" : "Agregar"}
          isSubmitting={savingInstallment}
        >
          <div className="space-y-4">
            <div>
              <Label>Número de cuotas</Label>
              <Input
                type="number"
                value={installmentValue}
                onChange={(e) => setInstallmentValue(e.target.value)}
                min={1}
                max={48}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Ej: 1 = pago único, 3 = 3 cuotas.
              </p>
            </div>
            <div>
              <Label>TEM — Tasa Efectiva Mensual (%)</Label>
              <Input
                value={installmentRate}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) setInstallmentRate(v);
                }}
                placeholder="0.00"
                className="font-mono"
                inputMode="decimal"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Tasa mensual que se cobra al comercio. No editar TNA.
              </p>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={installmentStatus}
                onChange={(e) => setInstallmentStatus(e.target.value as "Activo" | "Inactivo")}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </div>
          </div>
        </FormDialog>
      )}
    </>
  );
}
