import { createFileRoute } from "@tanstack/react-router";
import { CustomerCvuPage } from "@/features/customers/components/customer-cvu-page";

export const Route = createFileRoute("/admin/general/usuarios/cvu")({
  head: () => ({
    meta: [
      { title: "Usuarios con CVU — Usuarios — Admin Molly" },
      { name: "description", content: "Usuarios con CVU (Cuenta Virtual) habilitada." },
    ],
  }),
  component: CustomerCvuPage,
});
