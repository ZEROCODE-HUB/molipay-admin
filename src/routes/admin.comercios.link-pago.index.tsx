import { createFileRoute } from "@tanstack/react-router";
import { PaymentLinksPage } from "@/features/payment-links/components/payment-links-page";

export const Route = createFileRoute("/admin/comercios/link-pago/")({
  component: PaymentLinksPage,
  head: () => ({
    meta: [
      { title: "Enlaces de pago — Admin — Moli" },
      { name: "description", content: "Enlaces de pago creados desde Enterprise." },
    ],
  }),
});
