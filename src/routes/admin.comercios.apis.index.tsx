import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Eye,
  FileCheck,
  PauseCircle,
  Power,
  Trash2,
  X,
  Plus,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import {
  PageHeader,
  Badge,
  BtnOutline,
  BtnPrimary,
  Input,
  Label,
  Card,
} from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useApiUsuarios } from "@/hooks/useApiUsuarios";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createApiUsuario,
  deleteApiUsuario,
  setApiUsuarioEstado,
  updateApiUsuario,
} from "@/lib/api/api-usuarios";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { ApiUsuario, EstadoApiUsuario } from "@/lib/api/types";
import { ESTADOS_API_USUARIO } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/apis/")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Usuarios — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 25;

function estadoTone(estado: EstadoApiUsuario): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Producción") return "success";
  if (estado === "Suspendido" || estado === "Deshabilitado") return "danger";
  if (estado === "Homologación") return "warn";
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
          <p className="font-semibold">Ocurrió un error al cargar los usuarios de API</p>
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
      <p>No hay usuarios de API que coincidan con la búsqueda.</p>
    </div>
  );
}

function DetalleModal({ usr, onClose }: { usr: ApiUsuario; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de integración</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {usr.usuario} · Código {usr.codigoUsuarioApi}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Código de usuario API" value={usr.codigoUsuarioApi} />
              <Field label="Usuario" value={usr.usuario} />
              <Field label="Nombre completo" value={usr.nombreCompleto} />
              <Field
                label="Estado"
                value={<Badge tone={estadoTone(usr.estado)}>{usr.estado}</Badge>}
              />
              <Field
                label="Fecha de creación"
                value={
                  <span className="font-mono tabular-nums">
                    {new Date(usr.createdAt).toLocaleString("es-AR")}
                  </span>
                }
              />
            </div>
          </Card>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

type UsuarioForm = {
  codigoUsuarioApi: string;
  usuario: string;
  nombreCompleto: string;
  estado: EstadoApiUsuario;
};

function UsuarioFormModal({
  usuario,
  onClose,
  onSave,
}: {
  usuario: ApiUsuario | null;
  onClose: () => void;
  onSave: (form: UsuarioForm) => void;
}) {
  const [form, setForm] = useState<UsuarioForm>(() => ({
    codigoUsuarioApi: usuario?.codigoUsuarioApi ?? "",
    usuario: usuario?.usuario ?? "",
    nombreCompleto: usuario?.nombreCompleto ?? "",
    estado: usuario?.estado ?? "Pendiente Validación",
  }));

  const guardar = () => {
    if (
      form.codigoUsuarioApi.trim() === "" ||
      form.usuario.trim() === "" ||
      form.nombreCompleto.trim() === ""
    )
      return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={usuario ? "Editar usuario de API" : "Nuevo usuario de API"}
      description={
        usuario
          ? `Configuración del usuario ${usuario.usuario}.`
          : "Complete los datos para crear un nuevo usuario de API."
      }
      onSubmit={guardar}
      submitLabel={usuario ? "Guardar cambios" : "Crear usuario"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="au-codigo">Código de usuario API</Label>
          <Input
            id="au-codigo"
            value={form.codigoUsuarioApi}
            onChange={(e) => setForm((f) => ({ ...f, codigoUsuarioApi: e.target.value }))}
            placeholder="1001"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Debe ser único: no puede coincidir con el código de otro usuario de API.
          </p>
        </div>
        <div>
          <Label htmlFor="au-usuario">Usuario (email)</Label>
          <Input
            id="au-usuario"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            placeholder="afip@molipay.com.ar"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="au-nombre">Nombre completo</Label>
          <Input
            id="au-nombre"
            value={form.nombreCompleto}
            onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))}
            placeholder="Integración AFIP"
          />
        </div>
        <div>
          <Label htmlFor="au-estado">Estado</Label>
          <select
            id="au-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoApiUsuario }))}
          >
            {ESTADOS_API_USUARIO.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
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
  const [estadoFilter, setEstadoFilter] = useState<EstadoApiUsuario | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "apis_externas");
  const puedeModificar = can("modificar", "apis_externas");
  const puedeBorrar = can("borrar", "apis_externas");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useApiUsuarios({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
  });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [detail, setDetail] = useState<ApiUsuario | null>(null);
  const [editTarget, setEditTarget] = useState<ApiUsuario | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ApiUsuario | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["api_usuarios"] });

  const cambiarEstado = async (row: ApiUsuario, nuevo: EstadoApiUsuario) => {
    try {
      await setApiUsuarioEstado(row.id, nuevo);
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

  const guardar = async (form: UsuarioForm) => {
    try {
      if (editTarget) {
        await updateApiUsuario(editTarget.id, {
          codigoUsuarioApi: form.codigoUsuarioApi,
          usuario: form.usuario,
          nombreCompleto: form.nombreCompleto,
          estado: form.estado,
        });
      } else {
        await createApiUsuario({
          codigoUsuarioApi: form.codigoUsuarioApi,
          usuario: form.usuario,
          nombreCompleto: form.nombreCompleto,
          estado: form.estado,
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
        message: isDuplicado
          ? `Ya existe un usuario de API con el código "${form.codigoUsuarioApi.trim()}".`
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
      await deleteApiUsuario(confirmDelete.id);
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

  const getActions = (row: ApiUsuario): ActionItem[] => {
    const items: ActionItem[] = [
      { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
      {
        label: "Validar",
        icon: FileCheck,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Homologación"),
      },
      {
        label: "Suspender",
        icon: PauseCircle,
        variant: "danger",
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Suspendido"),
      },
      {
        label: "Activar",
        icon: Power,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Producción"),
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

  const columns: Column<ApiUsuario>[] = [
    {
      key: "codigoUsuarioApi",
      label: "Código de usuario API",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">#{r.codigoUsuarioApi}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      render: (r) => <span className="font-medium">{r.usuario}</span>,
    },
    {
      key: "nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      render: (r) => r.nombreCompleto,
    },
    {
      key: "estado",
      label: "Estado de la integración",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "createdAt",
      label: "Fecha de creación",
      sortable: true,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {new Date(r.createdAt).toLocaleString("es-AR")}
        </span>
      ),
    },
  ];

  return (
    <PermissionGuard recurso="apis_externas">
      <PageHeader
        title="Usuarios de API"
        description="Usuarios con acceso a las APIs externas de la plataforma."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nuevo usuario
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
            placeholder="Código, usuario o nombre…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as EstadoApiUsuario | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {ESTADOS_API_USUARIO.map((e) => (
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
          Cargando usuarios de API…
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
              {total} usuario(s) · página {page + 1} de {totalPaginas}
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

      {detail && <DetalleModal usr={detail} onClose={() => setDetail(null)} />}

      {(showNew || editTarget) && (
        <UsuarioFormModal
          usuario={editTarget}
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
        title="Eliminar usuario de API"
        message={`¿Estás seguro de eliminar el usuario "${confirmDelete?.usuario}"? Esta acción no se puede deshacer.`}
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
