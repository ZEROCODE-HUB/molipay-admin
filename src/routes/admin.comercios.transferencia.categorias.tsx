import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, XCircle, Edit3, Plus, Trash2, AlertTriangle, Inbox } from "lucide-react";
import { PageHeader, Badge, Input, Label, BtnPrimary, BtnOutline } from "@/components/portal-shell";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useCodigosCategoria } from "@/hooks/useCodigosCategoria";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createCodigoCategoria,
  deleteCodigoCategoria,
  setCodigoCategoriaEstado,
  updateCodigoCategoria,
} from "@/lib/api/codigos-categoria";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { CodigoCategoria } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/transferencia/categorias")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Códigos de categoría — Admin — Moli" },
      {
        name: "description",
        content: "Administración de códigos de categoría para comercios.",
      },
    ],
  }),
});

const PAGE_SIZE = 25;

function estadoBadgeTone(estado: "activo" | "inactivo"): "success" | "neutral" {
  return estado === "activo" ? "success" : "neutral";
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
          <p className="font-semibold">Ocurrió un error al cargar las categorías</p>
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
      <p>No hay categorías que coincidan con la búsqueda.</p>
    </div>
  );
}

type CategoriaForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
};

function CategoriaFormModal({
  categoria,
  onClose,
  onSave,
}: {
  categoria: CodigoCategoria | null;
  onClose: () => void;
  onSave: (form: CategoriaForm) => void;
}) {
  const [form, setForm] = useState<CategoriaForm>(() => ({
    codigo: categoria?.codigo ?? "",
    nombre: categoria?.nombre ?? "",
    descripcion: categoria?.descripcion ?? "",
  }));

  const guardar = () => {
    if (form.codigo.trim() === "" || form.nombre.trim() === "") return;
    onSave(form);
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={categoria ? "Editar categoría" : "Nueva categoría"}
      description={
        categoria
          ? `Modificá los datos de la categoría ${categoria.codigo}.`
          : "Complete los datos para crear una nueva categoría."
      }
      onSubmit={guardar}
      submitLabel={categoria ? "Guardar cambios" : "Crear categoría"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cat-codigo">Código</Label>
          <Input
            id="cat-codigo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            placeholder="CAT-XXX"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Debe ser único: no puede coincidir con el código de otra categoría.
          </p>
        </div>
        <div>
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input
            id="cat-nombre"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre de la categoría"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="cat-descripcion">Descripción</Label>
          <Input
            id="cat-descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Descripción breve"
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
  const [estadoFilter, setEstadoFilter] = useState<"activo" | "inactivo" | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "comercios");
  const puedeModificar = can("modificar", "comercios");
  const puedeBorrar = can("borrar", "comercios");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useCodigosCategoria({
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: estadoFilter || undefined,
    });

  const [editTarget, setEditTarget] = useState<CodigoCategoria | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CodigoCategoria | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["codigos_categoria"] });

  const cambiarEstado = async (row: CodigoCategoria, nuevo: "activo" | "inactivo") => {
    try {
      await setCodigoCategoriaEstado(row.id, nuevo);
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

  const guardar = async (form: CategoriaForm) => {
    try {
      if (editTarget) {
        await updateCodigoCategoria(editTarget.id, {
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
        });
      } else {
        await createCodigoCategoria({
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
          estado: "activo",
        });
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const err = e as DataAccessError;
      const isDuplicado =
        err instanceof DataAccessError &&
        (err.code === "23505" || /duplicat|unique/i.test(err.message));
      setConfirmAction({
        title: "No se pudo guardar",
        message: isDuplicado
          ? `Ya existe otra categoría con el código "${form.codigo.trim()}". El código debe ser único.`
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
      await deleteCodigoCategoria(confirmDelete.id);
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

  const getActions = (row: CodigoCategoria): ActionItem[] => {
    const items: ActionItem[] = [];
    if (row.estado === "activo") {
      items.push({
        label: "Desactivar",
        icon: XCircle,
        variant: "danger",
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "inactivo"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "activo"),
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
      icon: Trash2,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    });
    return items;
  };

  const columns: Column<CodigoCategoria>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => <span className="font-semibold">{r.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.descripcion}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Códigos de categoría"
        description="Administración de códigos de categoría para comercios."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva categoría
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
            placeholder="Código, nombre o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as "activo" | "inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando categorías…
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
              {total} categoría(s) · página {page + 1} de {totalPaginas}
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
        <CategoriaFormModal
          categoria={editTarget}
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
        title="Eliminar categoría"
        message={`¿Estás seguro de eliminar la categoría "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
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
