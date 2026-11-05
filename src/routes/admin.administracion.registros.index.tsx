import { createFileRoute } from "@tanstack/react-router";
import { RecordsPage } from "@/features/support/components/records-page";

export const Route = createFileRoute("/admin/administracion/registros/")({
  head: () => ({ meta: [{ title: "Fondos por usuario — Admin Panel" }] }),
  component: RecordsPage,
});
