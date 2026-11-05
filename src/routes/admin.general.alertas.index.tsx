import { createFileRoute } from "@tanstack/react-router";
import { AlertsPage } from "@/features/alerts/components/alerts-page";

export const Route = createFileRoute("/admin/general/alertas/")({
  head: () => ({
    meta: [{ title: "Listado de alertas — Admin" }],
  }),
  component: AlertsPage,
});
