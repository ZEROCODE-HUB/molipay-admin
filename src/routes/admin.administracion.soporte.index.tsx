import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/features/support/components/support-page";

export const Route = createFileRoute("/admin/administracion/soporte/")({
  head: () => ({ meta: [{ title: "Consultas frecuentes — Admin Panel" }] }),
  component: SupportPage,
});
