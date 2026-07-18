import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/modulos/transferencia/resolvers")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Resolvers — Admin — Molly Money Life" },
      { name: "description", content: "Gestión de resolvers del módulo de transferencias." },
    ],
  }),
});

// Elemento pendiente de confirmación con cliente (Sección 7). No implementar funcionalidad activa.

function Page() {
  return (
    <>
      <PageHeader
        title="Resolvers"
        description="Gestión de resolvers para pagos con transferencia."
      />
      <EmptyState
        title="Módulo Resolvers — pendiente de definición."
        description="Esta sección se encuentra en etapa de definición con el cliente. Una vez confirmados los requisitos, se habilitará la funcionalidad correspondiente."
      />
    </>
  );
}
