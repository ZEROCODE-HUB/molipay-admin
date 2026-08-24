import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Power, PowerOff, Edit3, Trash2, Plus, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useImpuestosAsignaciones, useImpuestosForAsignacion } from "@/hooks/useImpuestos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createImpuestoAsignacion,
  updateImpuestoAsignacion,
  setImpuestoAsignacionEstado,
  deleteImpuestoAsignacion,
} from "@/lib/api/impuestos";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { ImpuestoAsignacion, TipoImpuesto } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/impuestos/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios con impuestos — Admin — Moli" }] }),
  component: Page,
});

const PAGE_SIZE = 25;

const TIPOS_IMPUESTO: TipoImpuesto[] = ["Porcentaje", "Fijo", "Otro"];

function formatTasa(tasa: number) {
  return Number.isInteger(tasa) ? String(tasa) : tasa.toFixed(2);
}

function montoLabel(asig: ImpuestoAsignacion) {
  if (asig.monto === null) return "—";
  return asig.tipo === "Porcentaje" ? `${formatTasa(asig.monto)}%` : `$ ${formatTasa(asig.monto)}`;
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
          <p className="font-semibold">Ocurrió un error al cargar las asignaciones</p>
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
      <p>No hay asignaciones que coincidan con la búsqueda.</p>
    </div>
  );
}

type AsignacionForm = {
  clienteLegajo: string;
  impuestoId: string;
  tipo: TipoImpuesto;
  monto: string;
  estado: "Activo" | "Inactivo";
};

function AsignacionFormModal({
  asignacion,
  onClose,
  onSave,
}: {
  asignacion: ImpuestoAsignacion | null;
  onClose: () => void;
  onSave: (form: AsignacionForm) => void;
}) {
  const { rows: impuestosDisponibles } = useImpuestosForAsignacion();
  const [form, setForm] = useState<AsignacionForm>(() => ({
    clienteLegajo: asignacion?.clienteLegajo ?? "",
    impuestoId: asignacion?.impuestoId ?? "",
    tipo: asignacion?.tipo ?? "Porcentaje",
    monto:
      asignacion?.monto === null || asignacion?.monto === undefined ? "" : String(asignacion.monto),
    estado: asignacion?.estado ?? "Activo",
  }));

  const necesitaMonto = form.tipo !== "Otro";
  const legajoValido = /^[A-Z]{3}-\d{11}$/.test(form.clienteLegajo.trim());
  const montoValido = !necesitaMonto || (form.monto.trim() !== "" && Number(form.monto) >= 0);
  const valido =
    form.clienteLegajo.trim() !== "" &&
    (!asignacion ? legajoValido : true) && // el legajo no se edita
    form.impuestoId !== "" &&
    montoValido;

  const guardar = () => {
    if (!valido) return;
    onSave({ ...form, monto: necesitaMonto ? form.monto : "" });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={asignacion ? "Editar asignación" : "Nueva asignación de impuesto"}
      description={
        asignacion
          ? `Modificá la asignación de ${asignacion.clienteLegajo}.`
          : "Asigná un impuesto activo a un cliente por su legajo."
      }
      onSubmit={guardar}
      submitLabel={asignacion ? "Guardar cambios" : "Crear asignación"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="as-legajo">Legajo del cliente</Label>
          {asignacion ? (
            <>
              <Input id="as-legajo" value={form.clienteLegajo} disabled />
              <p className="text-[11px] text-muted-foreground mt-1">
                El legajo no se puede modificar.
              </p>
            </>
          ) : (
            <>
              <Input
                id="as-legajo"
                value={form.clienteLegajo}
                onChange={(e) => setForm({ ...form, clienteLegajo: e.target.value.toUpperCase() })}
                placeholder="LPF-20111111111"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Formato LPF/LPJ-CUIT (ej: LPF-20111111111). Debe existir en clientes.
              </p>
              {form.clienteLegajo.trim() !== "" && !legajoValido && (
                <p className="text-xs text-red-600 mt-1">Formato inválido. Ej: LPF-20111111111.</p>
              )}
            </>
          )}
        </div>
        <div>
          <Label htmlFor="as-impuesto">Impuesto</Label>
          <select
            id="as-impuesto"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.impuestoId}
            onChange={(e) => setForm({ ...form, impuestoId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {impuestosDisponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} — {i.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="as-tipo">Tipo</Label>
          <select
            id="as-tipo"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoImpuesto })}
          >
            {TIPOS_IMPUESTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="as-estado">Estado</Label>
          <select
            id="as-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        {necesitaMonto && (
          <div className="sm:col-span-2">
            <Label htmlFor="as-monto">Monto {form.tipo === "Porcentaje" ? "(%)" : "($)"}</Label>
            <Input
              id="as-monto"
              type="number"
              step="any"
              min="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder={form.tipo === "Porcentaje" ? "Ej: 35" : "Ej: 0.60"}
            />
          </div>
        )}
      </div>
      {!valido && (
        <p className="text-xs text-muted-foreground">
          Completá el legajo, el impuesto {necesitaMonto ? "y el monto" : ""} para poder guardar.
        </p>
      )}
    </FormDialog>
  );
}

function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [estadoFilter, setEstadoFilter] = useState<"Activo" | "Inactivo" | "">("");

  const { can } = useCan();
  const puedeCrear = can("crear", "impuestos");
  const puedeModificar = can("modificar", "impuestos");
  const puedeBorrar = can("borrar", "impuestos");

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } =
    useImpuestosAsignaciones({
      page,
      pageSize: PAGE_SIZE,
      search,
      estado: estadoFilter || undefined,
    });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editTarget, setEditTarget] = useState<ImpuestoAsignacion | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ImpuestoAsignacion | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["impuestos_asignaciones"] });

  const toggleEstado = async (row: ImpuestoAsignacion) => {
    try {
      await setImpuestoAsignacionEstado(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
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

  const guardar = async (form: AsignacionForm) => {
    try {
      if (editTarget) {
        await updateImpuestoAsignacion(editTarget.id, {
          impuesto_id: form.impuestoId || undefined,
          tipo: form.tipo,
          monto: form.tipo === "Otro" ? null : Number(form.monto),
          estado: form.estado,
        });
      } else {
        await createImpuestoAsignacion({
          cliente_legajo: form.clienteLegajo.trim(),
          impuesto_id: form.impuestoId,
          tipo: form.tipo,
          monto: form.tipo === "Otro" ? null : Number(form.monto),
          estado: form.estado,
        });
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const dErr = e as DataAccessError;
      const esFk = dErr.code === "23503" || /foreign key/i.test(dErr.message);
      setConfirmAction({
        title: "No se pudo guardar",
        message: esFk
          ? `El legajo "${form.clienteLegajo.trim()}" no existe en la tabla de clientes. Verificá el formato (LPF/LPJ-CUIT).`
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
      await deleteImpuestoAsignacion(confirmDelete.id);
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

  const getActions = (row: ImpuestoAsignacion): ActionItem[] => [
    {
      label: row.estado === "Activo" ? "Desactivar" : "Activar",
      icon: row.estado === "Activo" ? PowerOff : Power,
      disabled: !puedeModificar,
      onClick: () => toggleEstado(row),
    },
    { label: "Editar", icon: Edit3, disabled: !puedeModificar, onClick: () => setEditTarget(row) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      disabled: !puedeBorrar,
      onClick: () => setConfirmDelete(row),
    },
  ];

  const columns: Column<ImpuestoAsignacion>[] = [
    {
      key: "clienteLegajo",
      label: "Legajo",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">{r.clienteLegajo}</span>,
    },
    {
      key: "clienteNombre",
      label: "Cliente",
      render: (r) =>
        r.cliente ? (
          <div className="leading-tight">
            <div className="font-medium">{r.cliente.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.cliente.cuit}</div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "impuesto",
      label: "Impuesto aplicado",
      render: (r) =>
        r.impuesto ? (
          <div className="leading-tight">
            <div className="font-medium">{r.impuesto.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.impuesto.codigo}</div>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
      render: (r) => r.tipo,
    },
    {
      key: "monto",
      label: "Monto",
      render: (r) => <span className="font-mono tabular-nums">{montoLabel(r)}</span>,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
    {
      key: "fechaAsignacion",
      label: "Fecha de asignación",
      sortable: true,
      render: (r) =>
        r.fechaAsignacion ? (
          <span className="font-mono tabular-nums">
            {new Date(r.fechaAsignacion).toLocaleDateString("es-AR")}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Usuarios con impuestos"
        description="Asignaciones de impuestos a clientes."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nueva asignación
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
            placeholder="Código o nombre del impuesto…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <select
            id="f-estado"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value as "Activo" | "Inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
          Cargando asignaciones…
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
              {total} asignacion(es) · página {page + 1} de {totalPaginas}
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
        <AsignacionFormModal
          asignacion={editTarget}
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
        title="Eliminar asignación"
        message={`¿Eliminar la asignación de ${confirmDelete?.clienteLegajo ?? ""}? Esta acción no se puede deshacer.`}
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
