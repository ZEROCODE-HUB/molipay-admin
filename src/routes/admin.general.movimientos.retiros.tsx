import { createFileRoute } from "@tanstack/react-router";
import { MovimientosSubRoute } from "@/components/movimientos-subroute";

export const Route = createFileRoute("/admin/general/movimientos/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros — Movimientos — Admin Molly" },
      { name: "description", content: "Retiros realizados desde la plataforma Moli." },
    ],
  }),
  component: () => (
    <MovimientosSubRoute
      titulo="Retiros"
      descripcion="Transacciones de retiro salidas de la plataforma (incluye las transferencias enviadas)."
      tipoCode="retiro"
      tipos={["retiro", "transferencia"]}
    />
  ),
});
