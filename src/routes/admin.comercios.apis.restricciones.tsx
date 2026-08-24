import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Edit3, Plus, Trash2, X, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useApiRestricciones } from "@/hooks/useApiRestricciones";
import { useApiUsuarios } from "@/hooks/useApiUsuarios";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createApiRestriccion,
  deleteApiRestriccion,
  setApiRestriccionEstado,
  updateApiRestriccion,
} from "@/lib/api/api-restricciones";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { ApiRestriccion, EstadoRestriccion, ApiUsuario } from "@/lib/api/types";
import { ESTADOS_RESTRICCION } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/apis/restricciones")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Restricciones — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 25;

function estadoTone(estado: EstadoRestriccion): "danger" | "neutral" {
  return estado === "Restringiendo" ? "danger" : "neutral";
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
          <p className="font-semibold">Ocurrió un error al cargar las restricciones</p>
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
      <p>No hay restricciones que coincidan con la búsqueda.</p>
    </div>
  );
}

type RestriccionForm = {
  apiUsuarioId: string;
  estado: EstadoRestriccion;
  fechaExpiracion: string; // YYYY-MM-DD
};

function RestriccionFormModal({
  restriccion,
  usuarios,
  onClose,
  onSave,
}: {
  restriccion: ApiRestriccion | null;
  usuarios: ApiUsuario[];
  onClose: () => void;
  onSave: (form: RestriccionForm) => void;
}) {
  const [form, setForm] = useState<RestriccionForm>(() => ({
    apiUsuarioId: restriccion?.apiUsuarioId ?? "",
    estado: restriccion?.estado ?? "Restringiendo",
    fechaExpiracion: restriccion?.fechaExpiracion ?? "",
  }));

  const guardar = () => {
    if (!form.apiUsuarioId || !form.fechaExpiracion) return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={restriccion ? "Editar restricción" : "Nueva restricción"}
      description={
        restriccion
          ? `Configuración de la restricción de "${restriccion.apiUsuario?.nombreCompleto}".`
          : "Definí los datos del usuario y la vigencia de la restricción."
      }
      onSubmit={guardar}
      submitLabel={restriccion ? "Guardar cambios" : "Crear restricción"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="re-usuario">Usuario de API</Label>
          <select
            id="re-usuario"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.apiUsuarioId}
            onChange={(e) => setForm((f) => ({ ...f, apiUsuarioId: e.target.value }))}
            disabled={!!restriccion}
          >
            <option value="">Seleccioná un usuario…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.usuario} · {u.nombreCompleto} · Código #{u.codigoUsuarioApi}
              </option>
            ))}
          </select>
          {!restriccion && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Seleccioná el usuario de API al que aplica la restricción.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="re-estado">Estado</Label>
          <select
            id="re-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) =>
              setForm((f) => ({ ...f, estado: e.target.value as EstadoRestriccion }))
            }
          >
            <option value="Restringiendo">Restringiendo</option>
            <option value="No restringiendo">No restringiendo</option>
          </select>
        </div>
        <div>
          <Label htmlFor="re-expiracion">Fecha de expiración</Label>
          <Input
            id="re-expiracion"
            type="date"
            value={form.fechaExpiracion}
            onChange={(e) => setForm((f) => ({ ...f, fechaExpiracion: e.target.value }))}
          />
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
  const [estadoFilter, setEstadoFilter] = useState<EstadoRestriccion | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "apis_externas");
  const puedeModificar = can("modificar", "apis_externas");
  const puedeBorrar = can("borrar", "apis_externas");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useApiRestricciones({
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: estadoFilter || undefined,
    });

  const { rows: usuarios } = useApiUsuarios({ page: 0, pageSize: 500 });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editTarget, setEditTarget] = useState<ApiRestriccion | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ApiRestriccion | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["api_restricciones"] });

  const cambiarEstado = async (row: ApiRestriccion, nuevo: EstadoRestriccion) => {
    try {
      await setApiRestriccionEstado(row.id, nuevo);
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

  const guardar = async (form: {
    apiUsuarioId: string;
    estado: EstadoRestriccion;
    fechaExpiracion: string;
  }) => {
    try {
      if (editTarget) {
        await updateApiRestriccion(editTarget.id, {
          estado: form.estado,
          fechaExpiracion: form.fechaExpiracion || null,
        });
      } else {
        await createApiRestriccion({
          apiUsuarioId: form.apiUsuarioId,
          estado: form.estado,
          fechaExpiracion: form.fechaExpiracion || null,
        });
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const err = e as DataAccessError;
      const isDuplicado = err.code === "23505" || /duplicat|unique/i.test(err.message);
      setConfirmAction({
        title: "No se pudo guardar",
        message: isDuplicado ? `Ya existe una restricción para ese usuario.` : (e as Error).message,
        confirmLabel: "Cerrar",
        variant: "danger",
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteApiRestriccion(confirmDelete.id);
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

  const getActions = (row: ApiRestriccion): ActionItem[] => {
    const items: ActionItem[] = [
      {
        label: "Editar",
        icon: Edit3,
        disabled: !puedeModificar,
        onClick: () => setEditTarget(row),
      },
      {
        label: row.estado === "Restringiendo" ? "Sacar restricción" : "Restringir",
        icon: row.estado === "Restringiendo" ? Edit3 : Edit3,
        variant: row.estado === "Restringiendo" ? "danger" : "default",
        disabled: !puedeModificar,
        onClick: () =>
          cambiarEstado(row, row.estado === "Restringiendo" ? "No restringiendo" : "Restringiendo"),
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

  const columns: Column<ApiRestriccion>[] = [
    {
      key: "apiUsuario.codigoUsuarioApi",
      label: "Código usuario API",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">
          {r.apiUsuario?.codigoUsuarioApi ? (
            `#${r.apiUsuario.codigoUsuarioApi}`
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: "apiUsuario.usuario",
      label: "Usuario",
      sortable: true,
      render: (r) => r.apiUsuario?.usuario ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "apiUsuario.nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      render: (r) =>
        r.apiUsuario?.nombreCompleto ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {new Date(r.fechaCreacion).toLocaleString("es-AR")}
        </span>
      ),
    },
    {
      key: "fechaExpiracion",
      label: "Fecha de expiración",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.fechaExpiracion ? (
            new Date(r.fechaExpiracion).toLocaleDateString("es-AR")
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Restricciones"
        description="Restricciones de usuarios de API."
        action={
          <BtnPrimary
            type="button"
            onClick={() => setShowNew(true)}
            disabled={!puedeCrear || usuarios.length === 0}
          >
            <Plus size={14} /> Nueva restricción
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
            placeholder="Usuario, email, nombre o código…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as EstadoRestriccion | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS_RESTRICCION.map((e) => (
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
          Cargando restricciones…
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
              {total} restricción(es) · página {page + 1} de {totalPaginas}
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

      {(showNew || editTarget) && usuarios.length > 0 && (
        <RestriccionFormModal
          restriccion={editTarget}
          usuarios={usuarios}
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
        title="Eliminar restricción"
        message={`¿Estás seguro de eliminar la restricción de "${confirmDelete?.apiUsuario?.nombreCompleto}"? Esta acción no se puede deshacer.`}
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
