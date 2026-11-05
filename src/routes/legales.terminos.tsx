import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/features/legal/components/terms-page";

export const Route = createFileRoute("/legales/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — Moli" },
      { name: "description", content: "Términos y condiciones de uso de la plataforma Moli." },
    ],
  }),
  component: TermsPage,
});
