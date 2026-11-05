import { createFileRoute } from "@tanstack/react-router";
import { ParametersPage } from "@/features/payment-links/components/parameters-page";

export const Route = createFileRoute("/admin/comercios/link-pago/parametros")({
  component: ParametersPage,
  head: () => ({
    meta: [
      { title: "Parámetros de acreditación — Links de Pago — Admin — Moli" },
      { name: "description", content: "Porcentajes y reglas del cálculo de acreditaciones." },
    ],
  }),
});
