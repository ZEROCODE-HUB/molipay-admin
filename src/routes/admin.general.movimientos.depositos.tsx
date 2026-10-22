import { createFileRoute } from "@tanstack/react-router";
import { MovimientosSubRoute } from "@/components/movimientos-subroute";

export const Route = createFileRoute("/admin/general/movimientos/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — Movimientos — Admin Molly" },
      { name: "description", content: "Depósitos realizados en la plataforma Moli." },
    ],
  }),
  component: () => (
    <MovimientosSubRoute
      titulo="Depósitos"
      descripcion="Transacciones de depósito ingresadas a la plataforma."
      tipoCode="deposito"
    />
  ),
});
