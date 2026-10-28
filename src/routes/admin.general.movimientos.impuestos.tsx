import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";

export const Route = createFileRoute("/admin/general/movimientos/impuestos")({
  head: () => ({
    meta: [
      { title: "Impuestos cobrados — Movimientos — Admin Molly" },
      { name: "description", content: "Impuestos cobrados a través de la plataforma Moli." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Impuestos cobrados"
        description="Solo las líneas de impuesto (IVA sobre comisiones, etc.) de todas las operaciones. Clic en el TXID para ver la operación completa."
      />
      <MovimientosLineasTable tipoLinea="impuesto" />
    </PermissionGuard>
  ),
});
