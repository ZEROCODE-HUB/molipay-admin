import { createFileRoute } from "@tanstack/react-router";
import { IntegrationLoginsPage } from "@/features/system/components/integration-logins-page";

export const Route = createFileRoute("/admin/configuracion/logins")({
  component: IntegrationLoginsPage,
  head: () => ({
    meta: [
      { title: "Logins configurados — Admin — Moli" },
      { name: "description", content: "Logins de integraciones configurados en la plataforma." },
    ],
  }),
});
