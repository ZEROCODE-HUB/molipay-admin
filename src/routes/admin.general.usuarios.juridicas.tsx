import { createFileRoute } from "@tanstack/react-router";
import { CompaniesPage } from "@/features/customers/components/companies-page";

export const Route = createFileRoute("/admin/general/usuarios/juridicas")({
  head: () => ({
    meta: [
      { title: "Personas jurídicas — Usuarios — Admin Molly" },
      {
        name: "description",
        content: "Gestión de personas jurídicas registradas en la plataforma.",
      },
    ],
  }),
  component: CompaniesPage,
});
