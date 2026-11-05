import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";
import { PermissionGuard } from "@/features/rbac/access-gate";

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
      <MovementsLinesTable tipoLinea="impuesto" />
    </PermissionGuard>
  ),
});
