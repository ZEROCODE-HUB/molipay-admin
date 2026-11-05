import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";
import { PermissionGuard } from "@/features/rbac/access-gate";

export const Route = createFileRoute("/admin/general/movimientos/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — Movimientos — Admin Molly" },
      { name: "description", content: "Depósitos realizados en la plataforma Moli." },
    ],
  }),
  component: () => (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Depósitos"
        description="Depósitos entrantes, una fila por concepto (ingreso, comisión, impuesto). Las líneas de un mismo depósito comparten el TXID."
      />
      <MovementsLinesTable tiposOperacion={["deposito"]} />
    </PermissionGuard>
  ),
});
