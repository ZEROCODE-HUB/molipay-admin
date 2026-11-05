import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";
import { PermissionGuard } from "@/features/rbac/access-gate";

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
      <MovementsLinesTable tiposOperacion={["tarjeta"]} />
    </PermissionGuard>
  ),
});
