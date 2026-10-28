import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";

export const Route = createFileRoute("/admin/general/movimientos/comisiones")({
  head: () => ({
    meta: [
      { title: "Cobro de comisiones — Movimientos — Admin Molly" },
      { name: "description", content: "Comisiones cobradas por la plataforma Moli." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Cobro de comisiones"
        description="Solo las líneas de comisión de todas las operaciones. Clic en el TXID para ver la operación completa."
      />
      <MovimientosLineasTable tipoLinea="comision" />
    </PermissionGuard>
  ),
});
