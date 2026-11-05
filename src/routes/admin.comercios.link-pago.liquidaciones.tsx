import { createFileRoute } from "@tanstack/react-router";
import { SettlementsPage } from "@/features/payment-links/components/settlements-page";

export const Route = createFileRoute("/admin/comercios/link-pago/liquidaciones")({
  component: SettlementsPage,
  head: () => ({
    meta: [
      { title: "Carga de liquidaciones — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content: "Importación del archivo diario de liquidaciones de Payway.",
      },
    ],
  }),
});
