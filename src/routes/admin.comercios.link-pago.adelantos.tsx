import { createFileRoute } from "@tanstack/react-router";
import { AdvancesPage } from "@/features/payment-links/components/advances-page";
import { searchSchema } from "@/features/payment-links/advances.rules";

export const Route = createFileRoute("/admin/comercios/link-pago/adelantos")({
  validateSearch: searchSchema,
  component: AdvancesPage,
  head: () => ({
    meta: [
      { title: "Adelantos de Dinero — Links de Pago — Admin — Moli" },
      { name: "description", content: "Solicitudes de adelanto de fondos de comercios." },
    ],
  }),
});
