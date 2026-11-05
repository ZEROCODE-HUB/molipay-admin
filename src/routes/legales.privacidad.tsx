import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/features/legal/components/privacy-page";

export const Route = createFileRoute("/legales/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — Moli" },
      { name: "description", content: "Politica de privacidad y tratamiento de datos personales." },
    ],
  }),
  component: PrivacyPage,
});
