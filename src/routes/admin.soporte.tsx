import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/soporte")({
  head: () => ({ meta: [{ title: "Soporte — Admin Panel" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Soporte" description="Módulo de atención al cliente" />
      <EmptyState
        icon={<MessageCircle size={32} className="text-muted-foreground" />}
        title="Módulo de soporte"
        description="Esta sección está pendiente de definición. Pronto estará disponible la gestión de tickets y consultas de clientes."
      />
    </>
  );
}
