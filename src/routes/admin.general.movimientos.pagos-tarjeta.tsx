import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";

export const Route = createFileRoute("/admin/general/movimientos/pagos-tarjeta")({
  head: () => ({
    meta: [
      { title: "Pagos con tarjeta — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos con tarjeta procesados por la plataforma." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Pagos con tarjeta"
        description="Pagos con tarjeta, una fila por concepto. Las líneas de un mismo pago comparten el TXID."
      />
      <MovimientosLineasTable tiposOperacion={["tarjeta"]} />
    </PermissionGuard>
  ),
});
