import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/features/rbac/components/roles-page";

export const Route = createFileRoute("/admin/administracion/usuarios/roles")({
  head: () => ({ meta: [{ title: "Roles y permisos — Admin Panel" }] }),
  component: RolesPage,
});
