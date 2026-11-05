import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { RegistriesManagement } from "@/features/taxes/components/registries-management";
import { ReportsTaxes } from "@/features/taxes/components/tax-reports";
import { useCan } from "@/features/rbac/rbac.hooks";
import { PermissionGuard } from "@/features/rbac/access-gate";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const { can } = useCan();
  const canCreate = can("crear", "impuestos");

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Ingresos Brutos"
        description="Gestión de padrones, normalización retroactiva y reportes de presentación."
      />

      <section className="bg-card border rounded-lg p-5 mb-6">
        <RegistriesManagement puedeEditar={canCreate} />
      </section>

      <section className="bg-card border rounded-lg p-5">
        <ReportsTaxes puedeEditar={canCreate} />
      </section>
    </PermissionGuard>
  );
}
