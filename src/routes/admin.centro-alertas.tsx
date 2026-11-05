import { createFileRoute } from "@tanstack/react-router";
import { AlertCenterPage } from "@/features/alerts/components/alert-center-page";

export const Route = createFileRoute("/admin/centro-alertas")({
  component: AlertCenterPage,
});
