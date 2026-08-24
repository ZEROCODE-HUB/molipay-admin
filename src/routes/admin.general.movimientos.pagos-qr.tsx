import { createFileRoute } from "@tanstack/react-router";
import { MovimientosSubRoute } from "@/components/movimientos-subroute";

export const Route = createFileRoute("/admin/general/movimientos/pagos-qr")({
  head: () => ({
    meta: [
      { title: "Pagos QR — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos con QR (PCT) procesados por la plataforma." },
    ],
  }),
  component: () => (
    <MovimientosSubRoute
      titulo="Pagos QR"
      descripcion="Movimientos de pago PCT (QR)."
      tipoCode="pago_pct"
    />
  ),
});
