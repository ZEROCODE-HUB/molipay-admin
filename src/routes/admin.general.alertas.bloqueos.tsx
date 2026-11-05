import { createFileRoute } from "@tanstack/react-router";
import { BlocksPage } from "@/features/alerts/components/blocks-page";

export const Route = createFileRoute("/admin/general/alertas/bloqueos")({
  head: () => ({ meta: [{ title: "Listado de bloqueos — Admin Panel" }] }),
  component: BlocksPage,
});
