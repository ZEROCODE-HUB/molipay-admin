import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Edit3, Power, PowerOff, Trash2, Plus, X, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useApiEndpoints } from "@/hooks/useApiEndpoints";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createApiEndpoint,
  deleteApiEndpoint,
  setApiEndpointEstado,
  updateApiEndpoint,
} from "@/lib/api/api-endpoints";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { ApiEndpoint, EstadoEndpoint, GrupoEndpoint, MetodoHttp } from "@/lib/api/types";
import { ESTADOS_ENDPOINT, GRUPOS_ENDPOINT, METODOS_HTTP } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/apis/endpoints")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Endpoints — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 25;

function estadoTone(estado: EstadoEndpoint): "success" | "neutral" {
  return estado === "Habilitado" ? "success" : "neutral";
}

function metodoTone(metodo: MetodoHttp): "success" | "warn" | "danger" | "neutral" {
  if (metodo === "GET") return "success";
  if (metodo === "DELETE") return "danger";
  if (metodo === "POST") return "warn";
  return "neutral";
}

function MensajeEstado({
  tipo,
  mensaje,
  onRetry,
}: {
  tipo: "error" | "vacio" | "permiso";
  mensaje: string;
  onRetry?: () => void;
}) {
  if (tipo === "permiso") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm text-amber-800">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">No tenés permiso para ver esto</p>
          <p className="mt-1">{mensaje}</p>
        </div>
      </div>
    );
  }
  if (tipo === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center text-sm text-red-700">
        <AlertTriangle size={28} />
        <div>
          <p className="font-semibold">Ocurrió un error al cargar los endpoints</p>
          <p className="mt-1">{mensaje}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>No hay endpoints que coincidan con la búsqueda.</p>
    </div>
  );
}

type EndpointForm = {
  nombre: string;
  path: string;
  metodo: MetodoHttp;
  descripcion: string;
  grupo: GrupoEndpoint;
  estado: EstadoEndpoint;
  rec: boolean;
};

function EndpointFormModal({
  endpoint,
  onClose,
  onSave,
}: {
  endpoint: ApiEndpoint | null;
  onClose: () => void;
  onSave: (form: EndpointForm) => void;
}) {
  const [form, setForm] = useState<EndpointForm>(() => ({
    nombre: endpoint?.nombre ?? "",
    path: endpoint?.path ?? "",
    metodo: endpoint?.metodo ?? "GET",
    descripcion: endpoint?.descripcion ?? "",
    grupo: endpoint?.grupo ?? "Autenticación",
    estado: endpoint?.estado ?? "Habilitado",
    rec: endpoint?.rec ?? false,
  }));

  const guardar = () => {
    if (form.nombre.trim() === "" || form.path.trim() === "") return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={endpoint ? "Editar endpoint" : "Nuevo endpoint"}
      description={
        endpoint
          ? `Configuración del endpoint "${endpoint.nombre}".`
          : "Complete los datos para crear un nuevo endpoint."
      }
      onSubmit={guardar}
      submitLabel={endpoint ? "Guardar cambios" : "Crear endpoint"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="ep-nombre">Nombre del endpoint</Label>
          <Input
            id="ep-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ep-path">Path</Label>
          <Input
            id="ep-path"
            value={form.path}
            onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="ep-tipo">Tipo de endpoint</Label>
          <select
            id="ep-tipo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.metodo}
            onChange={(e) => setForm((f) => ({ ...f, metodo: e.target.value as MetodoHttp }))}
          >
            {METODOS_HTTP.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ep-grupo">Grupo de endpoints</Label>
          <select
            id="ep-grupo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.grupo}
            onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value as GrupoEndpoint }))}
          >
            {GRUPOS_ENDPOINT.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ep-desc">Descripción</Label>
          <Input
            id="ep-desc"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="ep-estado">Estado</Label>
          <select
            id="ep-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoEndpoint }))}
          >
            <option value="Habilitado">Habilitado</option>
            <option value="Deshabilitado">Deshabilitado</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ep-rec">REC</Label>
          <select
            id="ep-rec"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.rec ? "true" : "false"}
            onChange={(e) => setForm({ ...form, rec: e.target.value === "true" })}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
    </FormDialog>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<EstadoEndpoint | "">("");
  const [grupoFilter, setGrupoFilter] = useState<GrupoEndpoint | "">("");
  const [metodoFilter, setMetodoFilter] = useState<MetodoHttp | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "apis_externas");
  const puedeModificar = can("modificar", "apis_externas");
  const puedeBorrar = can("borrar", "apis_externas");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useApiEndpoints({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
    grupo: grupoFilter || undefined,
    metodo: metodoFilter || undefined,
  });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editTarget, setEditTarget] = useState<ApiEndpoint | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ApiEndpoint | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["api_endpoints"] });

  const cambiarEstado = async (row: ApiEndpoint, nuevo: EstadoEndpoint) => {
    try {
      await setApiEndpointEstado(row.id, nuevo);
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo actualizar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const guardar = async (form: EndpointForm) => {
    try {
      if (editTarget) {
        await updateApiEndpoint(editTarget.id, form);
      } else {
        await createApiEndpoint(form);
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const err = e as DataAccessError;
      const isDuplicado = err.code === "23505" || /duplicat|unique/i.test(err.message);
      setConfirmAction({
        title: "No se pudo guardar",
        message: isDuplicado
          ? `Ya existe un endpoint con ese path y método.`
          : (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteApiEndpoint(confirmDelete.id);
      invalidar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo eliminar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
    setConfirmDelete(null);
  };

  const getActions = (row: ApiEndpoint): ActionItem[] => {
    const items: ActionItem[] = [
      {
        label: "Editar",
        icon: Edit3,
        disabled: !puedeModificar,
        onClick: () => setEditTarget(row),
      },
      row.estado === "Habilitado"
        ? {
            label: "Deshabilitar",
            icon: PowerOff,
            variant: "danger",
            disabled: !puedeModificar,
            onClick: () => cambiarEstado(row, "Deshabilitado"),
          }
        : {
            label: "Habilitar",
            icon: Power,
            disabled: !puedeModificar,
            onClick: () => cambiarEstado(row, "Habilitado"),
          },
      {
        label: "Eliminar",
        icon: Trash2,
        variant: "danger",
        disabled: !puedeBorrar,
        onClick: () => setConfirmDelete(row),
      },
    ];
    return items;
  };

  const columns: Column<ApiEndpoint>[] = [
    {
      key: "nombre",
      label: "Nombre del endpoint",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "path",
      label: "Path",
      sortable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.path}</span>,
    },
    {
      key: "metodo",
      label: "Tipo de endpoint",
      sortable: true,
      render: (r) => <Badge tone={metodoTone(r.metodo)}>{r.metodo}</Badge>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      render: (r) => r.descripcion ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "grupo",
      label: "Grupo de endpoints",
      sortable: true,
      render: (r) => r.grupo,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "rec",
      label: "REC",
      sortable: true,
      render: (r) => (r.rec ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>),
    },
  ];

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Endpoints"
        description="Endpoints disponibles de las APIs externas de la plataforma."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nuevo endpoint
          </BtnPrimary>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Nombre, path o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as EstadoEndpoint | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS_ENDPOINT.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-grupo">Grupo</Label>
          <select
            id="f-grupo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={grupoFilter}
            onChange={(e) => {
              setGrupoFilter(e.target.value as GrupoEndpoint | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {GRUPOS_ENDPOINT.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-metodo">Método</Label>
          <select
            id="f-metodo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={metodoFilter}
            onChange={(e) => {
              setMetodoFilter(e.target.value as MetodoHttp | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {METODOS_HTTP.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando endpoints…
        </div>
      ) : isError ? (
        <MensajeEstado
          tipo={err?.permission ? "permiso" : "error"}
          mensaje={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <MensajeEstado tipo="vacio" mensaje="" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} endpoint(s) · página {page + 1} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPaginas || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {(showNew || editTarget) && (
        <EndpointFormModal
          endpoint={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardar}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar endpoint"
        message={`¿Estás seguro de eliminar el endpoint "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminar}
      />

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
