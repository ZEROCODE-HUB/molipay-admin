import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";

export const Route = createFileRoute("/admin/general/movimientos/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros — Movimientos — Admin Molly" },
      { name: "description", content: "Retiros realizados desde la plataforma Moli." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Retiros"
        description="Retiros y transferencias salientes (sin las internas entre subcuentas propias), una fila por concepto (egreso, comisión, impuesto)."
      />
      <MovimientosLineasTable tiposOperacion={["retiro", "transferencia"]} excluirInternas />
    </PermissionGuard>
  ),
});
