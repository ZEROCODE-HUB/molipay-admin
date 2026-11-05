import { createFileRoute } from "@tanstack/react-router";
import { SaleBatchesPage } from "@/features/payment-links/components/sale-batches-page";

export const Route = createFileRoute("/admin/comercios/link-pago/lotes-venta")({
  component: SaleBatchesPage,
  head: () => ({
    meta: [
      { title: "Lotes de Venta — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content: "Ventas brutas aprobadas por comercio y día. Informativo: no mueve dinero.",
      },
    ],
  }),
});
