import { createFileRoute } from "@tanstack/react-router";
import { CreditsPage } from "@/features/payment-links/components/credits-page";
import { searchSchema } from "@/features/payment-links/credits.rules";

export const Route = createFileRoute("/admin/comercios/link-pago/acreditaciones")({
  validateSearch: searchSchema,
  component: CreditsPage,
  head: () => ({
    meta: [
      { title: "Acreditaciones por día — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content:
          "Cuánto liquidó Payway cada día, cuánto ingresó a la recaudadora y cuánto se acreditó.",
      },
    ],
  }),
});
