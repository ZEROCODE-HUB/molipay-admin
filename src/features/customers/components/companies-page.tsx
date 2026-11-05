import { useCompaniesPage } from "@/features/customers/components/use-companies-page";
import { CustomerListFilters } from "./customer-list-filters";
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

      <CustomerListFilters
        placeholder="Buscar por razón social, correo, CUIT o legajo"
        status={vm.filterStatus}
        onSearchChange={vm.applySearch}
        onStatusChange={vm.applyStatus}
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
