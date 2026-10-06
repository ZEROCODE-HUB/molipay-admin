import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notificaciones")({
  component: NotificacionesLayout,
  head: () => ({
    meta: [
      { title: "Sistema de Notificaciones — Admin — Moli" },
      { name: "description", content: "Centro de notificaciones del sistema." },
    ],
  }),
});

function NotificacionesLayout() {
  return <Outlet />;
}
