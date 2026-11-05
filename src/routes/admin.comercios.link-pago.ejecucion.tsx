import { createFileRoute } from "@tanstack/react-router";
import { ExecutionPage } from "@/features/payment-links/components/execution-page";
import { searchSchema } from "@/features/payment-links/execution.rules";

export const Route = createFileRoute("/admin/comercios/link-pago/ejecucion")({
  validateSearch: searchSchema,
  component: ExecutionPage,
  head: () => ({
    meta: [
      { title: "Ejecución masiva — Links de Pago — Admin — Moli" },
      { name: "description", content: "Acreditación de varios lotes en una sola operación." },
    ],
  }),
});
