import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { PermissionGuard } from "@/components/permission-guard";
import { MovimientosLineasTable } from "@/components/movimientos/movimientos-lineas-table";
import { z } from "zod";

export const Route = createFileRoute("/admin/general/movimientos/")({
  validateSearch: z.object({ legajo: z.string().optional(), txid: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Movimientos por concepto (ingreso, comisión, impuesto) desde el ledger." },
    ],
  }),
  component: TodosPage,
});

function TodosPage() {
  const { legajo, txid } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Todos los movimientos"
        description="Una fila por concepto (ingreso, comisión, impuesto), contabilizada en el ledger. Las líneas de una misma operación comparten el TXID."
      />
      {/* key: si cambia el contexto de la URL (otro TXID / cliente) se reinician los filtros. */}
      <MovimientosLineasTable
        key={`${legajo ?? ""}|${txid ?? ""}`}
        legajo={legajo}
        initialTxid={txid}
        onClearContext={() => navigate({ to: "/admin/general/movimientos", search: {} })}
      />
    </PermissionGuard>
  );
}
