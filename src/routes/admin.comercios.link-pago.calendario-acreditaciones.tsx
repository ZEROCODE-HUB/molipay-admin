import { createFileRoute } from "@tanstack/react-router";
import { CreditCalendarPage } from "@/features/payment-links/components/credit-calendar-page";

export const Route = createFileRoute("/admin/comercios/link-pago/calendario-acreditaciones")({
  component: CreditCalendarPage,
  head: () => ({
    meta: [
      { title: "Calendario de acreditaciones — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content: "Cuánto se espera cobrar, cuánto llegó y cuánto ya se acreditó, por día hábil.",
      },
    ],
  }),
});
