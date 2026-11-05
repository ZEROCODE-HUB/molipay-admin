import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/features/system/components/integrations-page";

export const Route = createFileRoute("/admin/configuracion/")({
  component: IntegrationsPage,
  head: () => ({
    meta: [
      { title: "Gestor de Integraciones — Admin — Moli" },
      { name: "description", content: "Estado y gestión de las integraciones de la plataforma." },
    ],
  }),
});
