import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/features/notifications/components/notifications-page";

export const Route = createFileRoute("/admin/notificaciones/")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Centro de Notificaciones — Admin — Moli" },
      { name: "description", content: "Eventos de negocio y su estado de notificación." },
    ],
  }),
});
