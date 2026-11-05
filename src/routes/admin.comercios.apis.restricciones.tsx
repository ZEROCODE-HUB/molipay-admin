import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "@/features/external-apis/components/permissions-page";

export const Route = createFileRoute("/admin/comercios/apis/restricciones")({
  component: PermissionsPage,
  // `?id=` preselecciona la integracion (llega desde "Permisos y límites" en Credenciales).
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s.id === "string" ? { id: s.id } : {},
  head: () => ({
    meta: [
      { title: "Permisos — APIs externas — Admin — Moli" },
      {
        name: "description",
        content: "Endpoints y métodos habilitados por comercio y ambiente, límites y IPs.",
      },
    ],
  }),
});
