import { createFileRoute } from "@tanstack/react-router";
import { RecordsTotalPage } from "@/features/support/components/records-total-page";

export const Route = createFileRoute("/admin/administracion/registros/total")({
  head: () => ({ meta: [{ title: "Total de fondos — Admin Panel" }] }),
  component: RecordsTotalPage,
});
