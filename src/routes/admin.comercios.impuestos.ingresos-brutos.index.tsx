import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { GestionPadrones } from "@/components/impuestos/padron-iibb";
import { ReportesImpuestos } from "@/components/impuestos/reportes-impuestos";

export const Route = createFileRoute("/admin/comercios/impuestos/ingresos-brutos/")({
  head: () => ({ meta: [{ title: "Ingresos Brutos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Ingresos Brutos"
        description="Gestión de padrones, normalización retroactiva y reportes de presentación."
      />

      <section className="bg-card border rounded-lg p-5 mb-6">
        <GestionPadrones puedeEditar={puedeCrear} />
      </section>

      <section className="bg-card border rounded-lg p-5">
        <ReportesImpuestos puedeEditar={puedeCrear} />
      </section>
    </PermissionGuard>
  );
}
