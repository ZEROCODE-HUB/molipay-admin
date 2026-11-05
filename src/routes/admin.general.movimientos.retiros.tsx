import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";
import { PermissionGuard } from "@/features/rbac/access-gate";

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
      <MovementsLinesTable tiposOperacion={["retiro", "transferencia"]} excluirInternas />
    </PermissionGuard>
  ),
});
