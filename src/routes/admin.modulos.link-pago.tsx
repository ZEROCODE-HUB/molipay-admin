import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/modulos/link-pago")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Link de pago — Admin — Molly Money Life" },
      { name: "description", content: "Gestión del módulo de link de pago." },
    ],
  }),
});

function Page() {
  return (
    <>
      <PageHeader
        title="Link de pago"
        description="Gestión de enlaces de pago."
      />
      <EmptyState
        title="Módulo Link de pago — pendiente de definición."
        description="Esta funcionalidad se encuentra en etapa de definición. Estará disponible próximamente."
      />
    </>
  );
}
