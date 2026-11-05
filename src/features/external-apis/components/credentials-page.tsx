import { LoadingBlock } from "@/shared/ui/loading-block";
import { useMemo,useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
Ban,
CheckCircle2,
Eye,
KeyRound,
PauseCircle,
Play,
RotateCcw,
ShieldCheck,
XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { formatDateTime } from "@/shared/lib/format";
import { isAppError,userMessage } from "@/shared/lib/errors";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusMessage } from "@/shared/ui/status-message";
import {
useApiIntegrations,
useCanManageExternalApis,
useExternalApiActions,
} from "../external-apis.hooks";
import {
ENVIRONMENT_LABEL,
INTEGRATION_STATUS_FILTER,
INTEGRATION_STATUS_LABEL,
REASON_ACTION_COPY,
integrationStatusTone,
reasonActionDescription,
} from "../external-apis.rules";
import type { ApiIntegration,IntegrationStatus,ReasonAction } from "../external-apis.types";
import { IntegrationDetailModal } from "./integration-detail-modal";
import { ReasonDialog } from "./reason-dialog";

const PAGE_SIZE = 10;

const columns: Column<ApiIntegration>[] = [
  {
    key: "merchantName",
    label: "Comercio",
    sortable: true,
    render: (r) => (
      <div>
        <div className="font-medium">{r.merchantName}</div>
        <div className="font-mono text-xs text-muted-foreground">{r.legajo}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Estado de la integración",
    sortable: true,
    render: (r) => (
      <div>
        <Badge tone={integrationStatusTone(r.status)}>{INTEGRATION_STATUS_LABEL[r.status]}</Badge>
        {r.status === "suspended" && r.suspensionReason && (
          <div
            className="mt-0.5 max-w-[200px] truncate text-[10px] text-red-700"
            title={r.suspensionReason}
          >
            {r.suspensionReason}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "keys",
    label: "Llaves activas",
    render: (r) =>
      r.keys.length === 0 ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        <div className="space-y-0.5">
          {r.keys.map((k) => (
            <div key={k.environment} className="text-xs">
              <span
                className={
                  k.environment === "production"
                    ? "font-semibold text-emerald-700"
                    : "text-muted-foreground"
                }
              >
                {ENVIRONMENT_LABEL[k.environment]}
              </span>{" "}
              <span className="font-mono">{k.apiKey}</span>
            </div>
          ))}
        </div>
      ),
  },
  {
    key: "requests24h",
    label: "Uso 24 h",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums">
        {r.requests24h} req
        {r.errors24h > 0 && <span className="text-red-700"> · {r.errors24h} err</span>}
        {r.failedWebhooks > 0 && (
          <div className="text-amber-700">{r.failedWebhooks} webhook(s) fallido(s)</div>
        )}
      </span>
    ),
  },
  {
    key: "lastUsedAt",
    label: "Último uso",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums">{formatDateTime(r.lastUsedAt)}</span>
    ),
  },
  {
    key: "productionRequestedAt",
    label: "Pase solicitado",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs tabular-nums">
        {formatDateTime(r.productionRequestedAt)}
      </span>
    ),
  },
];

export function CredentialsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const canManage = useCanManageExternalApis();
  const actions = useExternalApiActions();
  const query = useApiIntegrations();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "">("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<{
    action: ReasonAction;
    row: ApiIntegration;
  } | null>(null);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const pending = all.filter((r) => r.status === "pending_production");
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (!statusFilter || r.status === statusFilter) &&
        (!s || `${r.merchantName} ${r.legajo}`.toLowerCase().includes(s)),
    );
  }, [all, statusFilter, search]);

  /** Confirma y ejecuta; si falla, avisa y deja el dialogo abierto. */
  const confirmAndRun = async (
    title: string,
    message: string,
    confirmLabel: string,
    run: () => Promise<void>,
  ) => {
    const ok = await confirm({ title, message, confirmLabel });
    if (!ok) return;
    try {
      await run();
      toast.success("Listo");
    } catch (e) {
      toast.error(userMessage(e, "No se pudo completar la acción."));
    }
  };

  const runReasonAction = async (reason: string) => {
    if (!reasonAction) return;
    const { action, row } = reasonAction;
    if (action === "suspend") await actions.suspend(row.id, reason);
    else if (action === "revoke") await actions.revoke(row.id, reason);
    else await actions.rejectProduction(row.id, reason);
    toast.success(`${REASON_ACTION_COPY[action].title}: listo`);
  };

  const rowActions = (r: ApiIntegration): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalle", icon: Eye, onClick: () => setDetailId(r.id) },
      {
        label: "Permisos y límites",
        icon: KeyRound,
        onClick: () =>
          void navigate({ to: "/admin/comercios/apis/restricciones", search: { id: r.id } }),
      },
    ];
    if (r.status === "pending_production") {
      items.push(
        {
          label: "Aprobar pase a producción",
          icon: CheckCircle2,
          disabled: !canManage,
          onClick: () =>
            void confirmAndRun(
              "Aprobar pase a producción",
              `${r.merchantName} va a poder operar con dinero real con su llave mp_live_. Se habilitan todos los endpoints salvo Transferencia saliente, que se habilita aparte en Permisos.`,
              "Aprobar",
              () => actions.approveProduction(r.id),
            ),
        },
        {
          label: "Rechazar pase",
          icon: XCircle,
          variant: "danger",
          disabled: !canManage,
          onClick: () => setReasonAction({ action: "reject", row: r }),
        },
      );
    }
    if (r.status === "suspended") {
      items.push({
        label: "Reactivar",
        icon: Play,
        disabled: !canManage,
        onClick: () =>
          void confirmAndRun(
            "Reactivar integración",
            `Vuelve al estado anterior a la suspensión y las llaves de ${r.merchantName} funcionan de nuevo.`,
            "Reactivar",
            () => actions.reactivate(r.id),
          ),
      });
    } else if (r.status !== "revoked") {
      items.push({
        label: "Suspender",
        icon: PauseCircle,
        variant: "danger",
        disabled: !canManage,
        onClick: () => setReasonAction({ action: "suspend", row: r }),
      });
    }
    if (r.status !== "revoked") {
      items.push({
        label: "Revocar definitivamente",
        icon: Ban,
        variant: "danger",
        disabled: !canManage,
        onClick: () => setReasonAction({ action: "revoke", row: r }),
      });
    }
    return items;
  };

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Credenciales de API"
        description="Integraciones de los comercios con la API de MoliPay: Sandbox, pase a producción, suspensión y revocación."
      />

      {pending.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} /> {pending.length} comercio(s) esperan la aprobación del pase a
            producción: <b>{pending.map((p) => p.merchantName).join(", ")}</b>
          </span>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => setStatusFilter("pending_production")}
          >
            Ver solicitudes
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Comercio o legajo…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <Select
            id="f-estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IntegrationStatus | "")}
          >
            <option value="">Todos</option>
            {INTEGRATION_STATUS_FILTER.map((s) => (
              <option key={s} value={s}>
                {INTEGRATION_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <BtnOutline type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RotateCcw size={14} className={query.isFetching ? "animate-spin" : ""} /> Actualizar
        </BtnOutline>
      </div>

      {query.isPending ? (
        <LoadingBlock label="Cargando credenciales…" />
      ) : query.isError ? (
        <StatusMessage
          kind={
            isAppError(query.error) && query.error.kind === "permission" ? "permission" : "error"
          }
          errorTitle="Ocurrió un error al cargar las credenciales"
          message={userMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <StatusMessage
          kind="empty"
          message={
            all.length
              ? "No hay integraciones con ese filtro."
              : "Ningún comercio generó llaves de API todavía."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.id}
          pageSize={PAGE_SIZE}
          showDownloadButton={false}
          actions={(r) => <ActionsDropdown actions={rowActions(r)} />}
        />
      )}

      {detailId && (
        <IntegrationDetailModal
          integrationId={detailId}
          canManage={canManage}
          onClose={() => setDetailId(null)}
        />
      )}

      <ReasonDialog
        open={!!reasonAction}
        title={reasonAction ? REASON_ACTION_COPY[reasonAction.action].title : ""}
        description={
          reasonAction
            ? reasonActionDescription(reasonAction.action, reasonAction.row.merchantName)
            : ""
        }
        submitLabel={reasonAction ? REASON_ACTION_COPY[reasonAction.action].submitLabel : ""}
        placeholder={
          reasonAction?.action === "suspend"
            ? "Ej.: revisión de compliance por operaciones inusuales"
            : ""
        }
        onSubmit={runReasonAction}
        onClose={() => setReasonAction(null)}
      />
    </PermissionGuard>
  );
}
