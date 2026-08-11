import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabLayout, type Tab } from "@/components/tab-layout";
import { useDeveloperMode } from "@/hooks/use-developer-mode";

export const Route = createFileRoute("/admin/configuracion/notificaciones")({
  component: NotificacionesLayout,
  head: () => ({
    meta: [
      { title: "Sistema de Notificaciones — Admin — Moli" },
      {
        name: "description",
        content: "Centro de notificaciones, canales de entrega y catálogo de códigos de error.",
      },
    ],
  }),
});

function NotificacionesLayout() {
  const { devMode } = useDeveloperMode();

  const tabs: Tab[] = [
    { label: "Centro de Notificaciones", to: "/admin/configuracion/notificaciones" },
    { label: "Canales de entrega", to: "/admin/configuracion/notificaciones/canales" },
    ...(devMode
      ? [{ label: "Catálogo de errores", to: "/admin/configuracion/notificaciones/catalogo" }]
      : []),
  ];

  return (
    <TabLayout tabs={tabs}>
      <Outlet />
    </TabLayout>
  );
}
