import { createFileRoute } from "@tanstack/react-router";
import { ExceptionsPage } from "@/features/payment-links/components/exceptions-page";

export const Route = createFileRoute("/admin/comercios/link-pago/excepciones")({
  component: ExceptionsPage,
  head: () => ({
    meta: [
      { title: "Excepciones de importación — Links de Pago — Admin — Moli" },
      {
        name: "description",
        content: "Renglones del archivo de Payway que no se pudieron asignar o no cuadran.",
      },
    ],
  }),
});
