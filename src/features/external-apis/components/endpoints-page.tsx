import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { useState } from "react";
import { Edit3,Plus,Power,PowerOff,Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { useCan } from "@/features/rbac/rbac.hooks";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { isAppError,userMessage } from "@/shared/lib/errors";
import { ActionsDropdown,type ActionItem } from "@/shared/ui/actions-dropdown";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { DataTable,type Column } from "@/shared/ui/data-table";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusMessage } from "@/shared/ui/status-message";
import { useApiEndpoints,useExternalApiActions } from "../external-apis.hooks";
import { ENDPOINT_STATUS_LABEL } from "../external-apis.rules";
import {
ENDPOINT_GROUPS,
ENDPOINT_STATUSES,
HTTP_METHODS,
type ApiEndpoint,
type EndpointGroup,
type EndpointStatus,
type HttpMethod,
} from "../external-apis.types";
import { EndpointDialog } from "./endpoint-dialog";

const PAGE_SIZE = 10;

const methodTone = (m: HttpMethod): "success" | "warn" | "danger" | "neutral" =>
  m === "GET" ? "success" : m === "DELETE" ? "danger" : m === "POST" ? "warn" : "neutral";

const columns: Column<ApiEndpoint>[] = [
  {
    key: "name",
    label: "Nombre del endpoint",
    sortable: true,
    render: (r) => <span className="font-semibold">{r.name}</span>,
  },
  {
    key: "path",
    label: "Path",
    sortable: true,
    render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.path}</span>,
  },
  {
    key: "method",
    label: "Tipo de endpoint",
    sortable: true,
    render: (r) => <Badge tone={methodTone(r.method)}>{r.method}</Badge>,
  },
  {
    key: "description",
    label: "Descripción",
    sortable: true,
    render: (r) => r.description ?? <span className="text-muted-foreground">—</span>,
  },
  { key: "group", label: "Grupo de endpoints", sortable: true, render: (r) => r.group },
  {
    key: "status",
    label: "Estado",
    sortable: true,
    render: (r) => (
      <Badge tone={r.status === "enabled" ? "success" : "neutral"}>
        {ENDPOINT_STATUS_LABEL[r.status]}
      </Badge>
    ),
  },
  {
    key: "rec",
    label: "REC",
    sortable: true,
    render: (r) => (r.rec ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>),
  },
];

export function EndpointsPage() {
  const confirm = useConfirm();
  const { can } = useCan();
  const canCreate = can("crear", "apis_externas");
  const canEdit = can("modificar", "apis_externas");
  const canDelete = can("borrar", "apis_externas");
  const { setEndpointStatus, deleteEndpoint } = useExternalApiActions();

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [status, setStatus] = useState<EndpointStatus | "">("");
  const [group, setGroup] = useState<EndpointGroup | "">("");
  const [method, setMethod] = useState<HttpMethod | "">("");
  // undefined = cerrado; null = alta; endpoint = edicion.
  const [editing, setEditing] = useState<ApiEndpoint | null | undefined>(undefined);

  const query = useApiEndpoints({
    page,
    pageSize: PAGE_SIZE,
    search,
    status: status || undefined,
    group: group || undefined,
    method: method || undefined,
  });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Cambia un filtro y vuelve a la primera pagina. */
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  const changeStatus = async (row: ApiEndpoint, next: EndpointStatus) => {
    try {
      await setEndpointStatus(row.id, next);
    } catch (e) {
      toast.error(userMessage(e, "No se pudo actualizar el endpoint."));
    }
  };

  const remove = async (row: ApiEndpoint) => {
    const ok = await confirm({
      title: "Eliminar endpoint",
      message: `¿Estás seguro de eliminar el endpoint "${row.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteEndpoint(row.id);
      toast.success("Endpoint eliminado");
    } catch (e) {
      toast.error(userMessage(e, "No se pudo eliminar el endpoint."));
    }
  };

  const rowActions = (row: ApiEndpoint): ActionItem[] => [
    { label: "Editar", icon: Edit3, disabled: !canEdit, onClick: () => setEditing(row) },
    row.status === "enabled"
      ? {
          label: "Deshabilitar",
          icon: PowerOff,
          variant: "danger",
          disabled: !canEdit,
          onClick: () => void changeStatus(row, "disabled"),
        }
      : {
          label: "Habilitar",
          icon: Power,
          disabled: !canEdit,
          onClick: () => void changeStatus(row, "enabled"),
        },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !canDelete,
      onClick: () => void remove(row),
    },
  ];

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Endpoints"
        description="Endpoints disponibles de las APIs externas de la plataforma."
        action={
          <BtnPrimary type="button" onClick={() => setEditing(null)} disabled={!canCreate}>
            <Plus size={14} /> Nuevo endpoint
          </BtnPrimary>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => filter(setSearchInput)(e.target.value)}
            placeholder="Nombre, path o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <Select
            id="f-estado"
            value={status}
            onChange={(e) => filter(setStatus)(e.target.value as EndpointStatus | "")}
          >
            <option value="">Todos</option>
            {ENDPOINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENDPOINT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-grupo">Grupo</Label>
          <Select
            id="f-grupo"
            value={group}
            onChange={(e) => filter(setGroup)(e.target.value as EndpointGroup | "")}
          >
            <option value="">Todos</option>
            {ENDPOINT_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-metodo">Método</Label>
          <Select
            id="f-metodo"
            value={method}
            onChange={(e) => filter(setMethod)(e.target.value as HttpMethod | "")}
          >
            <option value="">Todos</option>
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {query.isPending ? (
        <LoadingBlock label="Cargando endpoints…" />
      ) : query.isError ? (
        <StatusMessage
          kind={
            isAppError(query.error) && query.error.kind === "permission" ? "permission" : "error"
          }
          errorTitle="Ocurrió un error al cargar los endpoints"
          message={userMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <StatusMessage kind="empty" message="No hay endpoints que coincidan con la búsqueda." />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={rowActions(r)} />}
          />
          <Pagination
            variant="compact"
            page={page + 1}
            totalPages={totalPages}
            total={total}
            countLabel="endpoint(s)"
            disabled={query.isFetching}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      )}

      {editing !== undefined && (
        <EndpointDialog endpoint={editing} onClose={() => setEditing(undefined)} />
      )}
    </PermissionGuard>
  );
}
