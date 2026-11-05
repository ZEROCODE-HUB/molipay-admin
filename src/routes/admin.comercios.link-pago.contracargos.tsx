import { createFileRoute } from "@tanstack/react-router";
import { ChargebacksPage } from "@/features/payment-links/components/chargebacks-page";

export const Route = createFileRoute("/admin/comercios/link-pago/contracargos")({
  component: ChargebacksPage,
  head: () => ({
    meta: [
      { title: "Contracargos — Links de Pago — Admin — Moli" },
      { name: "description", content: "Gestión de contracargos de links de pago." },
    ],
  }),
});
