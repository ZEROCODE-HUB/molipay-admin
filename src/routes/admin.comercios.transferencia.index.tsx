import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { requireSupabase } from "@/lib/supabase";
import {
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  FileCheck,
  Trash2,
  XCircle as XCircleIcon,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Card, BtnOutline, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { LegajoCell } from "@/components/legajo-label";
import { useComercios } from "@/hooks/useComercios";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { updateComercio, setComercioEstado, deleteComercio } from "@/lib/api/comercios";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Comercio, EstadoComercio, NivelComercio, CodigoCategoria } from "@/lib/api/types";
import { ESTADOS_COMERCIO, NIVELES_COMERCIO } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/transferencia/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Comercios — Pagos con transferencia — Admin Molly" },
      {
        name: "description",
        content: "Gestión de comercios habilitados para pagos con transferencia (PCT).",
      },
    ],
  }),
});

const PAGE_SIZE = 25;

function estadoBadgeTone(estado: EstadoComercio): "success" | "neutral" | "warn" | "danger" {
  if (estado === "Activado") return "success";
  if (estado === "Desactivado") return "neutral";
  if (estado === "Rechazado") return "danger";
  return "warn";
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
          <p className="font-semibold">Ocurrió un error al cargar los comercios</p>
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
      <p>No hay comercios que coincidan con la búsqueda.</p>
    </div>
  );
}

function ComercioDetalle({ comercio, onClose }: { comercio: Comercio; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">Detalle de comercio</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {comercio.usuario} · {comercio.legajo}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <XCircleIcon size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Card className="p-5">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Información general
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Usuario" value={comercio.usuario} />
              <Field label="Legajo" value={<LegajoCell legajo={comercio.legajo} />} />
              <Field
                label="Fecha de registro"
                value={
                  <span className="font-mono text-xs tabular-nums">
                    {new Date(comercio.createdAt).toLocaleDateString("es-AR")}
                  </span>
                }
              />
              <Field
                label="Estado"
                value={<Badge tone={estadoBadgeTone(comercio.estado)}>{comercio.estado}</Badge>}
              />
              <Field label="Nivel" value={comercio.nivel} />
              <Field
                label="Categoría"
                value={
                  comercio.categoria ? (
                    <span className="font-mono tabular-nums">
                      {comercio.categoria.codigo} · {comercio.categoria.nombre}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
              />
            </div>
          </Card>

          <Card className="p-0">
            <div className="px-5 pt-5 pb-1">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Puntos de venta (PCT)
              </h4>
            </div>
            {comercio.puntosVenta.length === 0 ? (
              <div className="px-5 pb-5 pt-3">
                <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Sin puntos de venta cargados para este comercio.
                </div>
              </div>
            ) : (
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Nombre del punto de venta
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Estado
                      </th>
                      <th className="px-3 py-2.5 font-display font-semibold text-foreground">
                        Fecha de creación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comercio.puntosVenta.map((pdv) => (
                      <tr key={pdv.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5 font-medium">{pdv.nombre}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={pdv.estado === "Activado" ? "success" : "neutral"}>
                            {pdv.estado}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono tabular-nums text-xs">
                            {new Date(pdv.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

type ComercioForm = {
  categoriaId: string;
  nivel: NivelComercio;
  estado: EstadoComercio;
};

function ComercioFormModal({
  comercio,
  categorias,
  onClose,
  onSave,
}: {
  comercio: Comercio;
  categorias: CodigoCategoria[];
  onClose: () => void;
  onSave: (input: {
    categoriaId: number | null;
    nivel: NivelComercio;
    estado: EstadoComercio;
  }) => void;
}) {
  const [categoriaId, setCategoriaId] = useState(
    comercio?.categoriaId != null ? String(comercio.categoriaId) : "",
  );
  const [nivel, setNivel] = useState<NivelComercio>(comercio?.nivel ?? "Pequeño");
  const [estado, setEstado] = useState<EstadoComercio>(
    comercio?.estado ?? "Pendiente de aprobación",
  );

  const guardar = () => {
    onSave({
      categoriaId: categoriaId ? Number(categoriaId) : null,
      nivel,
      estado,
    });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Editar comercio"
      description={`Modificá los datos del comercio ${comercio.usuario}.`}
      onSubmit={guardar}
      submitLabel="Guardar cambios"
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="gc-categoria">Código de categoría</Label>
          <select
            id="gc-categoria"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="gc-nivel">Nivel</Label>
          <select
            id="gc-nivel"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as NivelComercio)}
          >
            {NIVELES_COMERCIO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="gc-estado">Estado</Label>
          <select
            id="gc-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoComercio)}
          >
            {ESTADOS_COMERCIO.map((e) => (
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

  const { can } = useCan();
  const puedeModificar = can("modificar", "comercios");
  const puedeBorrar = can("borrar", "comercios");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useComercios({
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const { data: categoriasRaw } = useQuery({
    queryKey: ["codigos_categoria", "all"],
    queryFn: async () => {
      const sb = requireSupabase();
      const { data, error } = await sb
        .from("codigos_categoria")
        .select("id, codigo, nombre, descripcion, estado, created_at, updated_at")
        .order("codigo", { ascending: true });
      if (error) throw new DataAccessError(error);
      return (data ?? []).map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        estado: r.estado,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const categorias = categoriasRaw ?? [];

  const [detail, setDetail] = useState<Comercio | null>(null);
  const [editTarget, setEditTarget] = useState<Comercio | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Comercio | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["comercios"] });

  const cambiarEstado = async (row: Comercio, nuevo: EstadoComercio) => {
    try {
      await setComercioEstado(row.id, nuevo);
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

  const guardarEdicion = async (input: {
    categoriaId: number | null;
    nivel: NivelComercio;
    estado: EstadoComercio;
  }) => {
    if (!editTarget) return;
    try {
      await updateComercio(editTarget.id, {
        categoriaId: input.categoriaId,
        nivel: input.nivel,
        estado: input.estado,
      });
      invalidar();
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
      await deleteComercio(confirmDelete.id);
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

  const getActions = (row: Comercio): ActionItem[] => {
    const items: ActionItem[] = [];
    if (row.estado === "Activado") {
      items.push({
        label: "Suspender",
        icon: XCircle,
        variant: "danger",
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Suspendido"),
      });
    } else {
      items.push({
        label: "Activar",
        icon: CheckCircle,
        disabled: !puedeModificar,
        onClick: () => cambiarEstado(row, "Activado"),
      });
    }
    items.push({
      label: "Validar",
      icon: FileCheck,
      disabled: !puedeModificar,
      onClick: () => cambiarEstado(row, "Activado"),
    });
    items.push({
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    });
    items.push({
      label: "Editar",
      icon: Edit3,
      disabled: !puedeModificar,
      onClick: () => setEditTarget(row),
    });
    items.push({ label: "Ver detalle", icon: Eye, onClick: () => setDetail(row) });
    return items;
  };

  const columns: Column<Comercio>[] = [
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.legajo}</span>,
    },
    {
      key: "usuario",
      label: "Usuario",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-semibold">{r.usuario}</span>,
    },
    {
      key: "nivel",
      label: "Nivel",
      sortable: true,
      filterable: true,
      render: (r) => r.nivel,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: [...ESTADOS_COMERCIO],
      render: (r) => <Badge tone={estadoBadgeTone(r.estado)}>{r.estado}</Badge>,
    },
    {
      key: "createdAt",
      label: "Registro",
      sortable: true,
      filterable: "date",
      render: (r) => (
        <span className="font-mono text-xs tabular-nums">
          {new Date(r.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Comercios"
        description="Gestión de comercios para pagos con transferencia (PCT)."
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
            placeholder="Usuario (email) o legajo…"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando comercios…
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
            showEnumAllOption={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              {total} comercio(s) · página {page + 1} de {totalPaginas}
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

      {detail && <ComercioDetalle comercio={detail} onClose={() => setDetail(null)} />}

      {editTarget && categorias && (
        <ComercioFormModal
          comercio={editTarget}
          categorias={categorias}
          onClose={() => setEditTarget(null)}
          onSave={guardarEdicion}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar comercio"
        message={`¿Estás seguro de eliminar el comercio "${confirmDelete?.usuario}"? Esta acción no se puede deshacer.`}
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
