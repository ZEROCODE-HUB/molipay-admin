import { createFileRoute } from "@tanstack/react-router";
import { LoginSettingsPage } from "@/features/system/components/login-settings-page";

export const Route = createFileRoute("/admin/configuracion/configuraciones")({
  component: LoginSettingsPage,
  head: () => ({
    meta: [
      { title: "Configuraciones de login — Admin — Moli" },
      { name: "description", content: "Configuraciones de los logins de las integraciones." },
    ],
  }),
});
