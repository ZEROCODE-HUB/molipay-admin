import { createFileRoute } from "@tanstack/react-router";
import { AlertSettingsPage } from "@/features/alerts/components/alert-settings-page";

export const Route = createFileRoute("/admin/general/alertas/parametros-alertas")({
  head: () => ({ meta: [{ title: "Parámetros de alertas — Admin Panel" }] }),
  component: AlertSettingsPage,
});
