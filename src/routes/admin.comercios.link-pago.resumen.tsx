import { createFileRoute } from "@tanstack/react-router";
import { SummaryPage } from "@/features/payment-links/components/summary-page";

export const Route = createFileRoute("/admin/comercios/link-pago/resumen")({
  component: SummaryPage,
  head: () => ({
    meta: [
      { title: "Resumen general — Link de Pago — Admin — Moli" },
      { name: "description", content: "Visión global de la operación de Link de Pago." },
    ],
  }),
});
