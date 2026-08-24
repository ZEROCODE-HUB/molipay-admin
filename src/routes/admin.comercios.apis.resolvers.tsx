import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, XCircle, Edit3, Plus, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader, Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useResolvers } from "@/hooks/useResolvers";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createResolver,
  deleteResolver,
  setResolverEstado,
  updateResolver,
} from "@/lib/api/resolvers";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Resolver, ResolverEstado } from "@/lib/api/types";
import { ESTADOS_RESOLVER } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/apis/resolvers")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Resolvers — APIs externas — Admin — Moli" },
      { name: "description", content: "Gestión de resolvers PCT (pagos con transferencia)." },
    ],
  }),
});

const PAGE_SIZE = 25;

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
          <p className="font-semibold">Ocurrió un error al cargar los resolvers</p>
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
      <p>No hay resolvers que coincidan con la búsqueda.</p>
    </div>
  );
}

type ResolverForm = {
  nombre: string;
  cuit: string;
  nombreReverso: string;
  formatoWeb: string;
  pcpId: string;
  idPcp: string;
  url: string;
  token: string;
  asHeader: boolean;
  soa: boolean;
};

function ResolverFormModal({
  resolver,
  onClose,
  onSave,
}: {
  resolver: Resolver | null;
  onClose: () => void;
  onSave: (form: ResolverForm) => void;
}) {
  const [form, setForm] = useState<ResolverForm>(() => ({
    nombre: resolver?.nombre ?? "",
    cuit: resolver?.cuit ?? "",
    nombreReverso: resolver?.nombreReverso ?? "",
    formatoWeb: resolver?.formatoWeb ?? "",
    pcpId: resolver?.pcpId ?? "",
    idPcp: resolver?.idPcp ?? "",
    url: resolver?.url ?? "",
    token: resolver?.token ?? "",
    asHeader: resolver?.asHeader ?? false,
    soa: resolver?.soa ?? false,
  }));

  const cuitValido = /^\d{11}$/.test(form.cuit.replace(/[\s-]/g, ""));

  const guardar = () => {
    if (form.nombre.trim() === "" || !cuitValido) return;
    onSave({ ...form, cuit: form.cuit.replace(/[\s-]/g, "") });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={resolver ? "Editar resolver" : "Alta nuevo resolver"}
      description={
        resolver
          ? `Configuración del resolver "${resolver.nombre}".`
          : "Complete los datos para crear un nuevo resolver."
      }
      onSubmit={guardar}
      submitLabel={resolver ? "Guardar cambios" : "Crear resolver"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="res-nombre">Nombre</Label>
          <Input
            id="res-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="res-cuit">CUIT (11 dígitos)</Label>
          <Input
            id="res-cuit"
            value={form.cuit}
            onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
            placeholder="30123456780"
          />
          {form.cuit && !cuitValido && (
            <p className="text-[11px] text-red-600 mt-1 text-xs">El CUIT debe tener 11 dígitos.</p>
          )}
        </div>
        <div>
          <Label htmlFor="res-reverso">Nombre Reverso</Label>
          <Input
            id="res-reverso"
            value={form.nombreReverso}
            onChange={(e) => setForm((f) => ({ ...f, nombreReverso: e.target.value }))}
            placeholder="com.ejemplo.app"
          />
        </div>
        <div>
          <Label htmlFor="res-formato-web">Formato web</Label>
          <Input
            id="res-formato-web"
            value={form.formatoWeb}
            onChange={(e) => setForm((f) => ({ ...f, formatoWeb: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="res-pcp-id">PCP ID</Label>
          <Input
            id="res-pcp-id"
            value={form.pcpId}
            onChange={(e) => setForm((f) => ({ ...f, pcpId: e.target.value }))}
            placeholder="PCP-XXXX"
          />
        </div>
        <div>
          <Label htmlFor="res-id-pcp">ID del PCP</Label>
          <Input
            id="res-id-pcp"
            value={form.idPcp}
            onChange={(e) => setForm((f) => ({ ...f, idPcp: e.target.value }))}
            placeholder="0001"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="res-url">URL</Label>
          <Input
            id="res-url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">Si no se coloca URL, no llevará IEP.</p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="res-token">Token</Label>
          <Input
            id="res-token"
            value={form.token}
            onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            checked={form.asHeader}
            onChange={(e) => setForm((f) => ({ ...f, asHeader: e.target.checked }))}
          />
          As header
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            checked={form.soa}
            onChange={(e) => setForm((f) => ({ ...f, soa: e.target.checked }))}
          />
          SOA
        </label>
      </div>
    </FormDialog>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<ResolverEstado | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "resolvers");
  const puedeModificar = can("modificar", "resolvers");
  const puedeBorrar = can("borrar", "resolvers");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useResolvers({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
  });

  const [editTarget, setEditTarget] = useState<Resolver | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Resolver | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["resolvers"] });

  const cambiarEstado = async (row: Resolver, nuevo: ResolverEstado) => {
    try {
      await setResolverEstado(row.id, nuevo);
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

  const guardar = async (form: ResolverForm) => {
    try {
      if (editTarget) {
        await updateResolver(editTarget.id, {
          nombre: form.nombre,
          cuit: form.cuit,
          nombreReverso: form.nombreReverso,
          formatoWeb: form.formatoWeb,
          pcpId: form.pcpId,
          idPcp: form.idPcp,
          url: form.url,
          token: form.token,
          asHeader: form.asHeader,
          soa: form.soa,
        });
      } else {
        await createResolver({
          nombre: form.nombre,
          cuit: form.cuit,
          nombreReverso: form.nombreReverso,
          formatoWeb: form.formatoWeb,
          pcpId: form.pcpId,
          idPcp: form.idPcp,
          url: form.url,
          token: form.token,
          asHeader: form.asHeader,
          soa: form.soa,
          estado: "Activo",
        });
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      setConfirmAction({
        title: "No se pudo guardar",
        message: (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteResolver(confirmDelete.id);
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

  const getActions = (row: Resolver): ActionItem[] => {
    const items: ActionItem[] = [];
    if (row.estado === "Activo") {
      items.push({
        label: "Desactivar",
        icon: XCircle,
        variant: "danger",
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Inactivo"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Activo"),
      });
    }
    items.push({
      label: "Editar",
      icon: Edit3,
      disabled: !puedeModificar,
      onClick: () => setEditTarget(row),
    });
    items.push({
      label: "Eliminar",
      icon: XCircle,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<Resolver>[] = [
    {
      key: "nombre",
      label: "Nombre del resolver",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "cuit",
      label: "CUIT del resolver",
      sortable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.cuit}</span>,
    },
    {
      key: "url",
      label: "URL del resolver",
      sortable: true,
      render: (r) => <span className="text-xs font-mono text-foreground/80">{r.url || "—"}</span>,
    },
    {
      key: "pcpId",
      label: "PCP ID",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.pcpId || "—"}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="resolvers">
      <PageHeader
        title="Resolvers"
        description="Gestión de resolvers PCT (pagos con transferencia)."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nuevo resolver
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
            placeholder="Nombre, CUIT o URL…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as ResolverEstado | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS_RESOLVER.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando resolvers…
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
              {total} resolver(es) · página {page + 1} de {totalPaginas}
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
        <ResolverFormModal
          resolver={editTarget}
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
        title="Eliminar resolver"
        message={`¿Estás seguro de eliminar el resolver "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
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
