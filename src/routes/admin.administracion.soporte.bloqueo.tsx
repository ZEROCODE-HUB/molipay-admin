import { createFileRoute } from "@tanstack/react-router";
import { SupportLockPage } from "@/features/support/components/support-lock-page";

export const Route = createFileRoute("/admin/administracion/soporte/bloqueo")({
  head: () => ({ meta: [{ title: "Bloqueo de funciones — Admin Panel" }] }),
  component: SupportLockPage,
});
