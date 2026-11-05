import { createFileRoute } from "@tanstack/react-router";
import { BatchesPage } from "@/features/payment-links/components/batches-page";
import { searchSchema } from "@/features/payment-links/batches.rules";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes")({
  validateSearch: searchSchema,
  component: BatchesPage,
  head: () => ({
    meta: [
      { title: "Lotes de Acreditación — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content: "Lotes generados por MoliPay para acreditar pagos a comercios.",
      },
    ],
  }),
});
