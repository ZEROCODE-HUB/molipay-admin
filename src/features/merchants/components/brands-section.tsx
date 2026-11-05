import { BrandsTable } from "./brands-table";
import { BrandFormDialog } from "./brand-form-dialog";
import { BrandInstallmentsCard } from "./brand-installments-card";
import { InstallmentFormDialog } from "./installment-form-dialog";
import { useBrandsSection } from "./use-brands-section";
import { Card } from "@/shared/ui/card";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

export function BrandsSection(props: { comercioId: string }) {
  const vm = useBrandsSection(props);
  const {
    confirmDelete,
    setConfirmDelete,
    installmentsBrand,
    confirmDeleteInstallment,
    setConfirmDeleteInstallment,
    openCreate,
    remove,
    removeInstallment,
  } = vm;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Banderas
        </h4>
        <BtnPrimary type="button" onClick={openCreate} className="h-8 px-3 text-xs">
          <Plus size={14} /> Agregar bandera
        </BtnPrimary>
      </div>
      <BrandsTable {...vm} />
      <BrandFormDialog {...vm} />
      {confirmDelete && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDelete(null)}
          title="Eliminar bandera"
          message={`¿Eliminar la bandera "${confirmDelete.bandera}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={remove}
        />
      )}

      {/* Panel de cuotas de la bandera seleccionada */}
      <BrandInstallmentsCard {...vm} />

      {/* Form cuota */}
      <InstallmentFormDialog {...vm} />

      {confirmDeleteInstallment && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDeleteInstallment(null)}
          title="Eliminar cuota"
          message={`¿Eliminar la cuota ${confirmDeleteInstallment.cuotas}x de ${installmentsBrand?.bandera}?`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={removeInstallment}
        />
      )}
    </Card>
  );
}
