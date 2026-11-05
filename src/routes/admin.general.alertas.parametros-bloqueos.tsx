import { createFileRoute } from "@tanstack/react-router";
import { BlockSettingsPage } from "@/features/alerts/components/block-settings-page";

export const Route = createFileRoute("/admin/general/alertas/parametros-bloqueos")({
  head: () => ({ meta: [{ title: "Parámetros de bloqueos — Admin Panel" }] }),
  component: BlockSettingsPage,
});
