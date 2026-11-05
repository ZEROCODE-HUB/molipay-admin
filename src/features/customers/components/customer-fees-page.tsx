import { ErrorNotice } from "@/shared/ui/error-notice";
import { CustomerFeesTable } from "./customer-fees-table";
import { CustomerFeeDetailDialog } from "./customer-fee-detail-dialog";
import { useCustomerFeesPage } from "./use-customer-fees-page";
import { Plus } from "lucide-react";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DesglosePreview } from "./customer-fees-parts";
import { FeeFormFields } from "./fee-form-fields";

export function CustomerFeesPage() {
  const vm = useCustomerFeesPage();
  const {
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    saving,
    formError,
    confirmAction,
    setConfirmAction,
    canCreate,
    draft,
    setDraft,
    openNew,
    saveDraft,
    draftDesglose,
  } = vm;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Carga de comisiones"
        description="Comisión e IVA de Retiro (transferencias salientes) y Depósito (ingresos al CVU), por CVU o para toda la cuenta del cliente como respaldo. La del CVU manda. Entre CVUs del mismo cliente no se cobra."
        action={
          <BtnPrimary onClick={openNew} disabled={!canCreate}>
            <Plus size={16} />
            Nueva comisión
          </BtnPrimary>
        }
      />

      <CustomerFeesTable {...vm} />

      <CustomerFeeDetailDialog {...vm} />

      {(editTarget || showNew) && (
        <FormDialog
          open
          onClose={() => {
            setEditTarget(null);
            setShowNew(false);
          }}
          title={editTarget ? "Editar comisión" : "Nueva comisión"}
          description={
            editTarget
              ? `Editando comisión ${editTarget.legajo}`
              : "Asignar una nueva comisión a un cliente."
          }
          onSubmit={saveDraft}
          submitLabel={saving ? "Guardando…" : "Guardar"}
          size="lg"
        >
          {formError && (
            <ErrorNotice className="mb-3">
              <span>{formError}</span>
            </ErrorNotice>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeeFormFields draft={draft} onChange={setDraft} />
            <div className="sm:col-span-2">
              <DesglosePreview desglose={draftDesglose} />
            </div>
          </div>
        </FormDialog>
      )}

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
