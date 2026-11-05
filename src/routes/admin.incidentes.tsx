import { createFileRoute } from "@tanstack/react-router";
import { IncidentsPage } from "@/features/system/components/incidents-page";

export const Route = createFileRoute("/admin/incidentes")({
  head: () => ({ meta: [{ title: "Comunicación de incidentes — Admin Panel" }] }),
  component: IncidentsPage,
});
