import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout } from "@/components/tab-layout";

export const Route = createFileRoute("/admin/configuracion")({
  component: ConfiguracionLayout,
  head: () => ({
    meta: [
      { title: "Configuración — Admin — Molly Money Life" },
      { name: "description", content: "Configuración del sistema administrativo Molly." },
    ],
  }),
});

function ConfiguracionLayout() {
  return (
    <TabLayout tabs={[
      { label: "Gestor de Logins", to: "/admin/configuracion" },
      { label: "Gestor de mensajes de error", to: "/admin/configuracion/mensajes" },
      { label: "Mensajes de Telegram", to: "/admin/configuracion/telegram" },
    ]}>
      <Outlet />
    </TabLayout>
  );
}
