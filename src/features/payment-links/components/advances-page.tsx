import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { AdvancesKpis } from "./advances-kpis";
import { useAdvancesPage } from "./use-advances-page";
import { type StatusAdvance } from "@/infrastructure/supabase/legacy/types";
import { formatMoney } from "@/shared/lib/format";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Building2,X } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Label } from "@/shared/ui/form-controls";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { label,tone } from "@/features/payment-links/advances.rules";
import { AdvanceDetail } from "./advance-detail";

export function AdvancesPage() {
  const vm = useAdvancesPage();
  const {
    setPage,
    statusFilter,
    setStatusFilter,
    detail,
    setDetail,
    confirm,
    setConfirm,
    merchantFromUrl,
    isLoading,
    isError,
    refetch,
    rowsVisibles,
    filtradoByMerchant,
    limpiarFilterMerchant,
    save,
    invalidateTodo,
    getActions,
    totalesByStatus,
    columns,
    err,
  } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Adelantos de Dinero"
        description="Solicitudes de comercios para recibir fondos antes de que Payway liquide. Se fondean desde la recaudadora de Payway hacia la Operativa del comercio y se compensan solos con sus próximos lotes."
      />

      {filtradoByMerchant && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 mb-4 flex items-center gap-2">
          <Building2 size={14} />
          <span>
            Viniendo del calendario: listado filtrado al comercio{" "}
            <span className="font-mono">{merchantFromUrl}</span>.
          </span>
          <button
            type="button"
            onClick={limpiarFilterMerchant}
            className="ml-auto h-6 px-2 rounded-md border bg-card text-xs hover:bg-muted inline-flex items-center gap-1"
          >
            <X size={12} /> Quitar filtro
          </button>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Estado</Label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusAdvance | "");
                setPage(0);
              }}
              className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border bg-background text-xs"
            >
              <option value="">Todos</option>
              <option value="Pendiente">Solicitado</option>
              <option value="Aprobado">Ofertado</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Rechazado">Rechazado</option>
              <option value="Acreditado">Acreditado</option>
              <option value="Compensado">Compensado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Cards de Pool de Recaudación (KPIs globales). Siempre visibles
          en la cabecera para que el operador vea el estado del pool antes
          de evaluar acreditar cualquier adelanto. */}
      <AdvancesKpis {...vm} />

      {/* Cards de totales por estado (cantidad + monto reservado) */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4">
        {(
          [
            "Pendiente",
            "Aprobado",
            "Aceptado",
            "Rechazado",
            "Acreditado",
            "Compensado",
            "Cancelado",
          ] as const
        ).map((s) => {
          const t = totalesByStatus[s];
          return (
            <Card key={s} className="p-3">
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{label(s)}</span>
                <Badge tone={tone(s)}>{t.cantidad}</Badge>
              </div>
              <div className="font-mono text-lg font-semibold mt-1">
                {t.monto > 0 ? formatMoney(t.monto) : "—"}
              </div>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingBlock label="Cargando adelantos…" />
      ) : isError ? (
        <StatusMessage kind="error" message={err?.message ?? "Error"} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={rowsVisibles}
          keyExtractor={(r) => r.fullId}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      )}

      {detail && (
        <AdvanceDetail
          a={detail}
          onClose={() => setDetail(null)}
          onSave={(u) => {
            save(u);
            invalidateTodo();
          }}
          onAcreditado={() => {
            invalidateTodo();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => setConfirm(null)}
        />
      )}
    </PermissionGuard>
  );
}
