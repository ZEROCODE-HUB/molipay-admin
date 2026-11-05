import { useNavigate,getRouteApi } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";
import { MovementsLinesTable } from "@/features/movements/components/movement-lines-table";
import { PermissionGuard } from "@/features/rbac/access-gate";

const route = getRouteApi("/admin/general/movimientos/");

export function MovementsPage() {
  const { legajo, txid } = route.useSearch();
  const navigate = useNavigate();

  return (
    <PermissionGuard recurso="movimientos">
      <PageHeader
        title="Todos los movimientos"
        description="Una fila por concepto (ingreso, comisión, impuesto), contabilizada en el ledger. Las líneas de una misma operación comparten el TXID."
      />
      {/* key: si cambia el contexto de la URL (otro TXID / cliente) se reinician los filtros. */}
      <MovementsLinesTable
        key={`${legajo ?? ""}|${txid ?? ""}`}
        legajo={legajo}
        initialTxid={txid}
        onClearContext={() => navigate({ to: "/admin/general/movimientos", search: {} })}
      />
    </PermissionGuard>
  );
}
