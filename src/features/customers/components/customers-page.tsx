import { CustomersTable } from "./customers-table";
import { useCustomersPage } from "./use-customers-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

// --- Tipos y mapeo de filas con enrichment --------------------------------

export function CustomersPage() {
  const vm = useCustomersPage();
  const { confirmAction, setConfirmAction } = vm;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Usuarios de la plataforma"
        description="Personas físicas — flujo homologado: Pendiente → Registrado → Preactivado → Activado."
      />

      <CustomersTable {...vm} />

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
