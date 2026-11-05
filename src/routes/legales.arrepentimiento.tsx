import { createFileRoute } from "@tanstack/react-router";
import { WithdrawalPage } from "@/features/legal/components/withdrawal-page";

export const Route = createFileRoute("/legales/arrepentimiento")({
  head: () => ({
    meta: [
      { title: "Botón de Arrepentimiento — Moli" },
      {
        name: "description",
        content: "Ejerce tu derecho de arrepentimiento conforme al articulo 34 de la Ley 24.240.",
      },
    ],
  }),
  component: WithdrawalPage,
});
