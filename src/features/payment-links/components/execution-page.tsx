import { useNavigate } from "@tanstack/react-router";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline } from "@/shared/ui/button";
import { History } from "lucide-react";
import { route } from "@/features/payment-links/execution.rules";
import { AdvanceHistory } from "./advance-history";
import { Asistente } from "./asistente";

export function ExecutionPage() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/admin/comercios/link-pago/ejecucion" });
  const history = search.vista === "historial" || !!search.ejecucion;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Ejecución masiva de acreditaciones"
        description="Seleccionar, revisar, confirmar y ver resultados. Nada se acredita hasta el paso 3, y solo se llega si los números cierran."
        action={
          history ? (
            <BtnOutline onClick={() => void navigate({ search: {} })}>Nueva ejecución</BtnOutline>
          ) : (
            <BtnOutline onClick={() => void navigate({ search: { vista: "historial" } })}>
              <History size={15} /> AdvanceHistory de ejecuciones
            </BtnOutline>
          )
        }
      />
      {history ? <AdvanceHistory ejecucionId={search.ejecucion} /> : <Asistente />}
    </PermissionGuard>
  );
}
