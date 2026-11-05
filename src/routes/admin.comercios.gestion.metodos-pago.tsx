import { createFileRoute } from "@tanstack/react-router";
import { PaymentMethodsPage } from "@/features/merchants/components/payment-methods-page";

export const Route = createFileRoute("/admin/comercios/gestion/metodos-pago")({
  component: PaymentMethodsPage,
  head: () => ({
    meta: [
      { title: "Métodos de pago — Gestión — Admin — Moli" },
      { name: "description", content: "Gestión de métodos de pago para comercios." },
    ],
  }),
});
