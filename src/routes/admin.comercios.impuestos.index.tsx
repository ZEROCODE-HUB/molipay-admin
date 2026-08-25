import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Power, PowerOff, Edit3, Trash2, Plus, X, AlertTriangle, Inbox } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, BtnOutline, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { useImpuestos } from "@/hooks/useImpuestos";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  createImpuesto,
  updateImpuesto,
  deleteImpuesto,
  setImpuestoEstado,
  listAlicuotas,
  createAlicuota,
  updateAlicuota,
  setAlicuotaEstado,
  deleteAlicuota,
} from "@/lib/api/impuestos";
import { DataAccessError } from "@/lib/api/errors";
import { useCan } from "@/lib/permissions";
import { PermissionGuard } from "@/components/permission-guard";
import type { Impuesto, TipoImpuesto, Alicuota } from "@/lib/api/types";

export const Route = createFileRoute("/admin/comercios/impuestos/")({
  component: Page,
  head: () => ({
    meta: [{ title: "Impuestos — Admin — Moli" }],
  }),
});

const PAGE_SIZE = 25;
const ALICUOTA_PAGE_SIZE = 5;

const TIPOS_IMPUESTO: TipoImpuesto[] = ["Porcentaje", "Fijo", "Otro"];

function estadoTone(estado: "Activo" | "Inactivo"): "success" | "neutral" {
  return estado === "Activo" ? "success" : "neutral";
}

function formatTasa(tasa: number) {
  return Number.isInteger(tasa) ? String(tasa) : tasa.toFixed(2);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
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
          <p className="font-semibold">Ocurrió un error al cargar los impuestos</p>
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
      <p>No hay impuestos que coincidan con la búsqueda.</p>
    </div>
  );
}

// --- Alícuotas (sub-tabla del detalle) --------------------------------------

function AlicuotasSection({ impuesto }: { impuesto: Impuesto }) {
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<Alicuota | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Alicuota | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [rows, setRows] = useState<Alicuota[]>(() => impuesto.alicuotas);
  const [total, setTotal] = useState(impuesto.alicuotas.length);

  const recargar = async () => {
    try {
      const res = await listAlicuotas({
        page,
        pageSize: ALICUOTA_PAGE_SIZE,
        impuesto_id: impuesto.id,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setConfirmAction({
        title: "No se pudo recargar",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const guardarAlicuota = async (form: {
    codigo: string;
    tasa: string;
    descripcion: string;
    estado: "Activo" | "Inactivo";
  }) => {
    try {
      if (editTarget) {
        await updateAlicuota(editTarget.id, {
          codigo: form.codigo,
          tasa: Number(form.tasa),
          descripcion: form.descripcion || null,
          estado: form.estado,
        });
      } else {
        await createAlicuota(impuesto.id, {
          impuesto_id: impuesto.id,
          codigo: form.codigo,
          tasa: Number(form.tasa),
          descripcion: form.descripcion || null,
          estado: form.estado,
        });
      }
      setShowNew(false);
      setEditTarget(null);
      recargar();
    } catch (e) {
      setConfirmAction({
        title: "No se pudo guardar",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const eliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteAlicuota(confirmDelete.id);
      setConfirmDelete(null);
      recargar();
    } catch (e) {
      setConfirmDelete(null);
      setConfirmAction({
        title: "No se pudo eliminar",
        message: (e as Error).message,
        onConfirm: () => setConfirmAction(null),
      });
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / ALICUOTA_PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alícuotas ({total})
        </h4>
        <BtnOutline
          type="button"
          onClick={() => {
            setEditTarget(null);
            setShowNew(true);
          }}
        >
          <Plus size={13} /> Agregar alícuota
        </BtnOutline>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Código
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Tasa (%)
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Descripción
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{a.codigo}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums">{formatTasa(a.tasa)}</td>
                <td className="px-4 py-2.5">{a.descripcion ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={a.estado === "Activo" ? "success" : "neutral"}>{a.estado}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    title="Editar"
                    className="p-1.5 hover:bg-muted rounded-md mr-1"
                    onClick={() => {
                      setShowNew(true);
                      setEditTarget(a);
                    }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    title={a.estado === "Activo" ? "Desactivar" : "Activar"}
                    className="p-1.5 hover:bg-muted rounded-md mr-1"
                    onClick={async () => {
                      try {
                        await setAlicuotaEstado(
                          a.id,
                          a.estado === "Activo" ? "Inactivo" : "Activo",
                        );
                        recargar();
                      } catch (e) {
                        setConfirmAction({
                          title: "No se pudo actualizar",
                          message: (e as Error).message,
                          onConfirm: () => setConfirmAction(null),
                        });
                      }
                    }}
                  >
                    {a.estado === "Activo" ? <PowerOff size={14} /> : <Power size={14} />}
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                    onClick={() => setConfirmDelete(a)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin alícuotas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3 text-sm text-muted-foreground">
          <span>
            Página {page + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => {
              setPage((p) => Math.max(0, p - 1));
            }}
            className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-xs disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page + 1 >= totalPaginas}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-xs disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {(showNew || editTarget) && (
        <AlicuotaFormModal
          alicuota={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={guardarAlicuota}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar alícuota"
        message={`¿Eliminar la alícuota "${confirmDelete?.codigo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={eliminar}
      />
      {confirmAction && (
        <ConfirmDialog
          open
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Cerrar"
          variant="danger"
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </div>
  );
}

type AlicuotaForm = {
  codigo: string;
  tasa: string;
  descripcion: string;
  estado: "Activo" | "Inactivo";
};

function AlicuotaFormModal({
  alicuota,
  onClose,
  onSave,
}: {
  alicuota: Alicuota | null;
  onClose: () => void;
  onSave: (form: AlicuotaForm) => void;
}) {
  const [form, setForm] = useState<AlicuotaForm>(() => ({
    codigo: alicuota?.codigo ?? "",
    tasa: alicuota ? String(alicuota.tasa) : "",
    descripcion: alicuota?.descripcion ?? "",
    estado: alicuota?.estado ?? "Activo",
  }));
  const valido = form.codigo.trim() !== "" && form.tasa.trim() !== "" && Number(form.tasa) >= 0;

  return (
    <FormDialog
      open
      onClose={onClose}
      title={alicuota ? "Editar alícuota" : "Nueva alícuota"}
      description="Definí el código y la tasa de la alícuota."
      onSubmit={() => valido && onSave(form)}
      submitLabel={alicuota ? "Guardar cambios" : "Crear alícuota"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Código</Label>
          <Input
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ej: CABA-3"
          />
        </div>
        <div>
          <Label>Tasa (%)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            value={form.tasa}
            onChange={(e) => setForm({ ...form, tasa: e.target.value })}
            placeholder="Ej: 3"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Descripción</Label>
          <Input
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div>
          <Label>Estado</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activa</option>
            <option value="Inactivo">Inactiva</option>
          </select>
        </div>
      </div>
    </FormDialog>
  );
}

// --- Detalle -----------------------------------------------------------------

function DetalleModal({ imp, onClose }: { imp: Impuesto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Detalle del impuesto: {imp.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{imp.codigo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Código" value={<span className="font-mono">{imp.codigo}</span>} />
            <Field label="Nombre" value={imp.nombre} />
            <Field label="Descripción" value={imp.descripcion ?? "—"} />
            <Field label="Tipo" value={imp.tipo} />
            <Field
              label="Monto"
              value={
                imp.monto === null ? (
                  "—"
                ) : (
                  <span className="font-mono tabular-nums">
                    {imp.tipo === "Porcentaje"
                      ? `${formatTasa(imp.monto)}%`
                      : `$ ${formatTasa(imp.monto)}`}
                  </span>
                )
              }
            />
            <Field
              label="Estado"
              value={<Badge tone={estadoTone(imp.estado)}>{imp.estado}</Badge>}
            />
            <Field
              label="Creado"
              value={
                <span className="font-mono tabular-nums">
                  {new Date(imp.createdAt).toLocaleString("es-AR")}
                </span>
              }
            />
            <Field
              label="Actualizado"
              value={
                <span className="font-mono tabular-nums">
                  {new Date(imp.updatedAt).toLocaleString("es-AR")}
                </span>
              }
            />
          </div>
          <AlicuotasSection impuesto={imp} />
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

// --- Form principal -----------------------------------------------------------

type ImpuestoForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoImpuesto;
  monto: string;
  estado: "Activo" | "Inactivo";
};

function ImpuestoFormModal({
  impuesto,
  onClose,
  onSave,
}: {
  impuesto: Impuesto | null;
  onClose: () => void;
  onSave: (form: ImpuestoForm) => void;
}) {
  const [form, setForm] = useState<ImpuestoForm>(() => ({
    codigo: impuesto?.codigo ?? "",
    nombre: impuesto?.nombre ?? "",
    descripcion: impuesto?.descripcion ?? "",
    tipo: impuesto?.tipo ?? "Porcentaje",
    monto: impuesto?.monto === null || impuesto?.monto === undefined ? "" : String(impuesto.monto),
    estado: impuesto?.estado ?? "Activo",
  }));

  const necesitaMonto = form.tipo !== "Otro";
  const montoValido = !necesitaMonto || (form.monto.trim() !== "" && Number(form.monto) >= 0);
  const valido = form.codigo.trim() !== "" && form.nombre.trim() !== "" && montoValido;

  const guardar = () => {
    if (!valido) return;
    onSave({
      ...form,
      monto: necesitaMonto ? form.monto : "",
    });
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={impuesto ? "Editar impuesto" : "Nuevo impuesto"}
      description={
        impuesto
          ? `Modificá los datos del impuesto "${impuesto.nombre}".`
          : "Definí el tipo de impuesto y su monto."
      }
      onSubmit={guardar}
      submitLabel={impuesto ? "Guardar cambios" : "Crear impuesto"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="im-codigo">Código</Label>
          <Input
            id="im-codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ej: IIBB"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Debe ser único entre los impuestos.
          </p>
        </div>
        <div>
          <Label htmlFor="im-nombre">Nombre</Label>
          <Input
            id="im-nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Ingresos Brutos"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="im-desc">Descripción</Label>
          <Input
            id="im-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="im-tipo">Tipo de impuesto</Label>
          <select
            id="im-tipo"
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
          <Label htmlFor="im-estado">Estado</Label>
          <select
            id="im-estado"
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
            <Label htmlFor="im-monto">Monto {form.tipo === "Porcentaje" ? "(%)" : "($)"}</Label>
            <Input
              id="im-monto"
              type="number"
              step="any"
              min="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder={form.tipo === "Porcentaje" ? "Ej: 35" : "Ej: 0.60"}
            />
            {form.monto.trim() !== "" && Number(form.monto) < 0 && (
              <p className="text-xs text-red-600 mt-1">El monto no puede ser negativo.</p>
            )}
          </div>
        )}
      </div>
      {!valido && (
        <p className="text-xs text-muted-foreground">
          Completá el código y el nombre {necesitaMonto ? "y el monto" : ""} para poder guardar.
        </p>
      )}
    </FormDialog>
  );
}

// --- Página --------------------------------------------------------------------

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

  const { rows, total, isLoading, isFetching, isError, error, isEmpty, refetch } = useImpuestos({
    page,
    pageSize: PAGE_SIZE,
    search,
    estado: estadoFilter || undefined,
  });

  const err = error instanceof DataAccessError ? error : null;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [detail, setDetail] = useState<Impuesto | null>(null);
  const [editTarget, setEditTarget] = useState<Impuesto | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Impuesto | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["impuestos"] });

  const toggleEstado = async (row: Impuesto) => {
    try {
      await setImpuestoEstado(row.id, row.estado === "Activo" ? "Inactivo" : "Activo");
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

  const guardar = async (form: ImpuestoForm) => {
    const necesitaMonto = form.tipo !== "Otro";
    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      monto: necesitaMonto ? Number(form.monto) : null,
      estado: form.estado,
    };
    try {
      if (editTarget) {
        await updateImpuesto(editTarget.id, payload);
      } else {
        await createImpuesto(payload);
      }
      invalidar();
      setShowNew(false);
      setEditTarget(null);
    } catch (e) {
      const dErr = e as DataAccessError;
      const esDuplicado = dErr.code === "23505" || /duplicat|unique/i.test(dErr.message);
      setConfirmAction({
        title: "No se pudo guardar",
        message: esDuplicado
          ? `Ya existe un impuesto con el código "${form.codigo.trim()}".`
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
      await deleteImpuesto(confirmDelete.id);
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

  const getActions = (row: Impuesto): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
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

  const columns: Column<Impuesto>[] = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (r) => <span className="font-medium">{r.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (r) => r.descripcion ?? "—",
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
      sortable: true,
      render: (r) =>
        r.monto === null ? (
          "—"
        ) : (
          <span className="font-mono tabular-nums">
            {r.tipo === "Porcentaje" ? `${formatTasa(r.monto)}%` : `$ ${formatTasa(r.monto)}`}
          </span>
        ),
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => <Badge tone={estadoTone(r.estado)}>{r.estado}</Badge>,
    },
  ];

  return (
    <PermissionGuard recurso="impuestos">
      <PageHeader
        title="Impuestos"
        description="Catálogo de tipos de impuestos de la plataforma y su monto."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!puedeCrear}>
            <Plus size={14} /> Nuevo impuesto
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
          Cargando impuestos…
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
              {total} impuesto(s) · página {page + 1} de {totalPaginas}
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

      {detail && <DetalleModal imp={detail} onClose={() => setDetail(null)} />}

      {(showNew || editTarget) && (
        <ImpuestoFormModal
          impuesto={editTarget}
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
        title="Eliminar impuesto"
        message={`¿Estás seguro de eliminar el impuesto "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
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
