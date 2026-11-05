import { createFileRoute } from "@tanstack/react-router";
import { BackofficeUsersPage } from "@/features/backoffice-users/components/backoffice-users-page";

export const Route = createFileRoute("/admin/administracion/usuarios/")({
  head: () => ({ meta: [{ title: "Usuarios backoffice — Admin Panel" }] }),
  component: BackofficeUsersPage,
});
