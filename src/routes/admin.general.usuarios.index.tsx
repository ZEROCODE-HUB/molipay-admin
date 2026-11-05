import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/features/customers/components/customers-page";

export const Route = createFileRoute("/admin/general/usuarios/")({
  head: () => ({
    meta: [
      { title: "Personas físicas — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de personas físicas registradas en la plataforma." },
    ],
  }),
  component: CustomersPage,
});
