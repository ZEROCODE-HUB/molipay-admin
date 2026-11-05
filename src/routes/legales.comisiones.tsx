import { createFileRoute } from "@tanstack/react-router";
import { LegalFeesPage } from "@/features/legal/components/fees-page";

export const Route = createFileRoute("/legales/comisiones")({
  head: () => ({
    meta: [
      { title: "Tabla de Comisiones — Moli" },
      {
        name: "description",
        content: "Detalle de comisiones y aranceles vigentes de la plataforma.",
      },
    ],
  }),
  component: LegalFeesPage,
});
