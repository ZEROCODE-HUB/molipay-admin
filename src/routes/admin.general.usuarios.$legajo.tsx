import { createFileRoute } from "@tanstack/react-router";
import { CustomerDetailPage } from "@/features/customers/components/customer-detail-page";

export const Route = createFileRoute("/admin/general/usuarios/$legajo")({
  head: () => ({
    meta: [{ title: "Ficha de cliente — Admin Molly" }],
  }),
  component: CustomerDetailPage,
});
