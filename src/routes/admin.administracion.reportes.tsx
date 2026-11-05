import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/regulatory-reports/components/reports-page";

export const Route = createFileRoute("/admin/administracion/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Admin Panel" }] }),
  component: ReportsPage,
});
