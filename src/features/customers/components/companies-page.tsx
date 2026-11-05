import { useCompaniesPage } from "@/features/customers/components/use-companies-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { CompaniesTable } from "@/features/customers/components/companies-table";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

export function CompaniesPage() {
  const vm = useCompaniesPage();
  const { confirmAction, setConfirmAction } = vm;

  return (
    <PermissionGuard recurso="usuarios">
      <PageHeader
        title="Personas jurídicas"
        description="Empresas y organizaciones — flujo homologado con personas físicas."
      />

      <CompaniesTable {...vm} />

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
