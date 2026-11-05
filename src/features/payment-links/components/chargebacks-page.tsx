import { useMemo,useState } from "react";
import {
listChargebacks,
statusUiToDb,
type Contra,
type StatusContra,
} from "@/features/payment-links/chargebacks.supabase";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useRealtimeInvalidation } from "@/infrastructure/supabase/use-realtime-invalidation";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { AlertTriangle,Download,Eye,Plus,UploadCloud } from "lucide-react";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { formatMoney } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { ImportarChargebacksModal } from "@/features/payment-links/components/import-chargebacks-modal";
import { SimulateChargebacksModal } from "@/features/payment-links/components/simulate-chargebacks-modal";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { STATUS_LABEL,STATUS_OPTIONS_UI,tone } from "@/features/payment-links/chargebacks.rules";
import { Detail } from "./chargebacks-detail";
import { CreateModal } from "./create-modal";

// ---------------------------------------------------------------------------
// ChargebacksPage
// ---------------------------------------------------------------------------

export function ChargebacksPage() {
  const [detail, setDetail] = useState<Contra | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusContra | "">("");
  const { can } = useCan();
  const canGestionar = can("modificar", "comercios");
  const qc = useQueryClient();

  const filterStatus = useMemo<StatusContra | undefined>(() => {
    if (!statusFilter) return undefined;
    return statusFilter;
  }, [statusFilter]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contracargos", filterStatus ? statusUiToDb(filterStatus) : undefined],
    queryFn: () => listChargebacks(filterStatus ? { estado: filterStatus } : undefined),
  });

  // Realtime: cualquier cambio en contracargos (incluso desde Enterprise)
  // invalida esta query y la de lotes (por si cambió contracargo_monto).
  useRealtimeInvalidation([{ table: "contracargos" }], [["contracargos"], ["lotes"]]);

  const getActions = (r: Contra): ActionItem[] => {
    const base: ActionItem[] = [
      { label: "Ver / gestionar", icon: Eye, onClick: () => setDetail(r) },
    ];
    if (r.estado === "Simulado" && canGestionar) {
      base.push({
        label: "Confirmar (Aplicar)",
        icon: AlertTriangle,
        onClick: () => setDetail(r),
      });
    }
    return base;
  };

  const columns: Column<Contra>[] = [
    {
      key: "id",
      label: "ID",
      filterable: true,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.esSimulacion && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-medium">
              sim
            </span>
          )}
          {r.siteTransactionId && (
            <span
              className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-medium"
              title="Importado de PayWay"
            >
              PW
            </span>
          )}
          <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: "comercio",
      label: "Comercio",
      filterable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-sm truncate max-w-[140px]">{r.comercioNombre}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.comercioLegajo}</div>
        </div>
      ),
    },
    {
      key: "importe",
      label: "Importe",
      render: (r) => (
        <span className="font-mono tabular-nums font-semibold text-red-600">
          -{formatMoney(r.importe)}
        </span>
      ),
    },
    {
      key: "ticketPayway",
      label: "Ticket / TID",
      filterable: true,
      render: (r) => (
        <div className="space-y-0.5">
          {r.ticketPayway && <span className="font-mono text-xs block">{r.ticketPayway}</span>}
          {r.siteTransactionId && (
            <span
              className="font-mono text-[10px] text-muted-foreground block truncate max-w-[160px]"
              title={r.siteTransactionId}
            >
              TID: {r.siteTransactionId.slice(0, 12)}…
            </span>
          )}
          {!r.ticketPayway && !r.siteTransactionId && "—"}
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum",
      filterOptions: STATUS_OPTIONS_UI.map((s) => STATUS_LABEL[s]),
      render: (r) => <Badge tone={tone(r.estado)}>{STATUS_LABEL[r.estado]}</Badge>,
    },
    {
      key: "createdAt",
      label: "Fecha",
      render: (r) => (
        <span className="font-mono text-xs">
          {new Date(r.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  // KPIs: usar la lista completa que ya cargamos
  const kpis: Record<StatusContra, number> = {
    Simulado: 0,
    Abierto: 0,
    En_mediación: 0,
    En_mediacion: 0,
    Cerrado_acreditado: 0,
    Cerrado_retenido: 0,
  };
  for (const r of rows) kpis[r.estado] = (kpis[r.estado] ?? 0) + 1;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Contracargos"
        description="Gestión de contracargos de links de pago. Simular impacto → confirmar para aplicar."
      />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground mb-4">
        <strong>Flujo:</strong> Simular (carga manual) → Confirmar (aplica descuento al lote) → En
        mediación (doc) → Cerrado acreditado / retenido. Los contracargos de simulación no afectan
        la caja ni los lotes.
      </div>

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusContra | "")}
            className="h-8 px-2 rounded-md border bg-background text-xs"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS_UI.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {canGestionar && (
            <button
              onClick={() => setShowImportar(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-card text-xs font-semibold hover:bg-muted"
              title="Importar reporte de Alertas Tempranas de PayWay"
            >
              <UploadCloud size={14} /> Importar PayWay
            </button>
          )}
          {canGestionar && (
            <button
              onClick={() => setShowSimulate(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-card text-xs font-semibold hover:bg-muted"
              title="CSV de prueba con ventas reales de lotes Programados o Pendientes"
            >
              <Download size={14} /> Simular contracargos
            </button>
          )}
          {canGestionar && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Plus size={14} /> Simular contracargo
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {STATUS_OPTIONS_UI.map((s) => (
          <Card key={s} className="p-3">
            <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
            <div className="font-mono text-xl font-semibold mt-1">{kpis[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        keyExtractor={(r) => r.id}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {detail && <Detail c={detail} onClose={() => setDetail(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {showImportar && <ImportarChargebacksModal onClose={() => setShowImportar(false)} />}
      {showSimulate && <SimulateChargebacksModal onClose={() => setShowSimulate(false)} />}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </PermissionGuard>
  );
}
