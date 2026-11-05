import { createFileRoute } from "@tanstack/react-router";
import { CustomerFeesPage } from "@/features/customers/components/customer-fees-page";

export const Route = createFileRoute("/admin/general/usuarios/comisiones")({
  head: () => ({
    meta: [
      { title: "Carga de comisiones — Usuarios — Admin Molly" },
      {
        name: "description",
        content: "Gestión de comisiones asignadas a usuarios de la plataforma.",
      },
    ],
  }),
  component: CustomerFeesPage,
});
