import { createFileRoute } from "@tanstack/react-router";
import { TaxUsersPage } from "@/features/taxes/components/tax-users-page";

export const Route = createFileRoute("/admin/comercios/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con impuestos — Admin — Moli" }] }),
  component: TaxUsersPage,
});
