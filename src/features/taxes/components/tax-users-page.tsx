import { TaxUsersContent } from "./tax-users-content";
import { useTaxUsersPage } from "./use-tax-users-page";
import { Plus } from "lucide-react";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { AssignmentFormModal } from "./assignment-form-modal";

export function TaxUsersPage() {
  const vm = useTaxUsersPage();
  const {
    tab,
    setTab,
    canCreate,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    confirmDelete,
    setConfirmDelete,
    confirmAction,
    setConfirmAction,
    save,
    remove,
  } = vm;

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Usuarios con impuestos"
        description="Qué impuestos se le cobran a cada comercio. Sin asignación activa, el impuesto no se cobra."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!canCreate}>
            <Plus size={14} /> Nueva asignación
          </BtnPrimary>
        }
      />

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("asignaciones")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "asignaciones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Asignaciones
        </button>
        <button
          onClick={() => setTab("por_cobrar")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "por_cobrar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Impuestos por cobrar
        </button>
      </div>

      <TaxUsersContent {...vm} />

      {(showNew || editTarget) && (
        <AssignmentFormModal
          asignacion={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar asignación"
        message={`¿Eliminar la asignación de ${confirmDelete?.clienteLegajo ?? ""}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={remove}
      />

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
