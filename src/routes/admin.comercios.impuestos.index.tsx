import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Power,
  PowerOff,
  Edit3,
  Trash2,
  Eye,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, Label, BtnOutline } from "@/components/portal-shell";
import { impuestosIniciales, type Impuesto, type Estatus, type Alicuota } from "@/data/impuestos";

type TipoImpuesto = Impuesto["tipoImpuesto"];

type ImpuestoForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoImpuesto: TipoImpuesto;
  monto: string;
  estado: Estatus;
};

const blankForm: ImpuestoForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  tipoImpuesto: "Porcentaje",
  monto: "",
  estado: "Activo",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

const ALICUOTA_PAGE_SIZES = [2, 5, 10];

function formatTasa(tasa: number) {
  return Number.isInteger(tasa) ? String(tasa) : tasa.toFixed(2);
}

function AlicuotasTable({ alicuotas }: { alicuotas: Alicuota[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(2);

  const total = alicuotas.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  const rows = alicuotas.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Código
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Tasa
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Descripción
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.codigo} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{a.codigo}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums">{formatTasa(a.tasa)}</td>
                <td className="px-4 py-2.5">{a.descripcion}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={a.estado === "Activa" ? "success" : "neutral"}>{a.estado}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin alícuotas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap">Elementos por página:</span>
          <select
            className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/40"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {ALICUOTA_PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-muted-foreground text-xs sm:text-sm">
            Mostrando {start}–{end} de {total} · Pág. {safePage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              title="Primero"
              aria-label="Primero"
              className="h-8 w-8 grid place-items-center rounded-md border border-input bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              title="Anterior"
              aria-label="Anterior"
              className="h-8 w-8 grid place-items-center rounded-md border border-input bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              title="Siguiente"
              aria-label="Siguiente"
              className="h-8 w-8 grid place-items-center rounded-md border border-input bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              title="Último"
              aria-label="Último"
              className="h-8 w-8 grid place-items-center rounded-md border border-input bg-card text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpuestoModal({ imp, onClose }: { imp: Impuesto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Detalle del Impuesto: {imp.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{imp.codigo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="ID" value={imp.codigo} />
            <Field label="Nombre" value={imp.nombre} />
            <Field label="Descripción" value={imp.descripcion} />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Activo</div>
              <div className="mt-1">
                {imp.estado === "Activo" ? (
                  <Badge tone="success">Sí</Badge>
                ) : (
                  <Badge tone="neutral">No</Badge>
                )}
              </div>
            </div>
            <Field label="Creado" value={imp.fechaCreacion} />
            <Field label="Actualizado" value={imp.fechaActualizacion} />
          </div>

          <div>
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Alícuotas
            </h4>
            <AlicuotasTable alicuotas={imp.alicuotas} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <BtnOutline type="button" onClick={onClose}>
            CERRAR
          </BtnOutline>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/comercios/impuestos/")({
  head: () => ({ meta: [{ title: "Impuestos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<Impuesto[]>(impuestosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Impuesto | null>(null);
  const [form, setForm] = useState<ImpuestoForm>(blankForm);
  const [toggleTarget, setToggleTarget] = useState<Impuesto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Impuesto | null>(null);
  const [detail, setDetail] = useState<Impuesto | null>(null);

  const openNew = () => {
    setEditTarget(null);
    setForm(blankForm);
    setShowForm(true);
  };

  const openEdit = (imp: Impuesto) => {
    setEditTarget(imp);
    setForm({
      codigo: imp.codigo,
      nombre: imp.nombre,
      descripcion: imp.descripcion,
      tipoImpuesto: imp.tipoImpuesto,
      monto: imp.monto === null ? "" : String(imp.monto),
      estado: imp.estado,
    });
    setShowForm(true);
  };

  const necesitaMonto = form.tipoImpuesto === "Porcentaje" || form.tipoImpuesto === "Fijo";
  const montoValido = !necesitaMonto || (form.monto.trim() !== "" && Number(form.monto) > 0);
  const formValido = form.codigo.trim() !== "" && form.nombre.trim() !== "" && montoValido;

  const persist = () => {
    if (!formValido) return;
    if (editTarget) {
      setData((prev) =>
        prev.map((d) =>
          d.id === editTarget.id
            ? {
                ...d,
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim(),
                descripcion: form.descripcion.trim(),
                tipoImpuesto: form.tipoImpuesto,
                monto: necesitaMonto ? Number(form.monto) : null,
                estado: form.estado,
                fechaActualizacion: new Date().toISOString().slice(0, 10),
              }
            : d,
        ),
      );
    } else {
      const nextId = Math.max(0, ...data.map((d) => d.id)) + 1;
      setData((prev) => [
        {
          id: nextId,
          codigo: form.codigo.trim(),
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          tipoImpuesto: form.tipoImpuesto,
          monto: necesitaMonto ? Number(form.monto) : null,
          estado: form.estado,
          fechaCreacion: new Date().toISOString().slice(0, 10),
          fechaActualizacion: new Date().toISOString().slice(0, 10),
          alicuotas: [],
        },
        ...prev,
      ]);
    }
    setShowForm(false);
    setEditTarget(null);
    setForm(blankForm);
  };

  const getActions = (imp: Impuesto): ActionItem[] => [
    ...(imp.estado === "Activo"
      ? [
          {
            label: "Desactivar",
            icon: PowerOff,
            variant: "danger" as const,
            onClick: () => setToggleTarget(imp),
          },
        ]
      : [
          {
            label: "Activar",
            icon: Power,
            onClick: () => setToggleTarget(imp),
          },
        ]),
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(imp) },
    { label: "Editar", icon: Edit3, onClick: () => openEdit(imp) },
    { label: "Eliminar", icon: Trash2, variant: "danger", onClick: () => setDeleteTarget(imp) },
  ];

  const columns: Column<Impuesto>[] = [
    {
      key: "codigo",
      label: "ID",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.codigo}</span>,
    },
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      sortable: true,
      filterable: true,
      render: (r) => r.descripcion,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Activo", "Inactivo"],
      render: (r) => <Badge tone={r.estado === "Activo" ? "success" : "neutral"}>{r.estado}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Impuestos"
        description="Catálogo de tipos de impuestos de la plataforma y su monto."
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} /> Nuevo impuesto
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {showForm && (
        <FormDialog
          open
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
          title={editTarget ? "Editar impuesto" : "Nuevo impuesto"}
          description={
            editTarget
              ? `Modificá los datos del impuesto "${editTarget.nombre}".`
              : "Definí el tipo de impuesto y su monto."
          }
          onSubmit={persist}
          submitLabel={editTarget ? "Guardar cambios" : "Crear impuesto"}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>ID</Label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ej: IIBB"
              />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Ingresos Brutos"
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
              <Label>Tipo de impuesto</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={form.tipoImpuesto}
                onChange={(e) => setForm({ ...form, tipoImpuesto: e.target.value as TipoImpuesto })}
              >
                <option value="Porcentaje">Porcentaje</option>
                <option value="Fijo">Fijo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as Estatus })}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            {necesitaMonto && (
              <div className="sm:col-span-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  placeholder={form.tipoImpuesto === "Porcentaje" ? "Ej: 35" : "Ej: 0,6"}
                />
                {form.monto.trim() !== "" && Number(form.monto) <= 0 && (
                  <p className="text-xs text-red-600 mt-1">Ingresá un monto mayor a cero.</p>
                )}
              </div>
            )}
          </div>
          {!formValido && (
            <p className="text-xs text-muted-foreground">
              Completá el ID y el nombre {necesitaMonto ? "y el monto" : ""} para poder guardar.
            </p>
          )}
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.estado === "Activo" ? "Desactivar impuesto" : "Activar impuesto"}
        message={`¿Estás seguro de ${toggleTarget?.estado === "Activo" ? "desactivar" : "activar"} el impuesto "${toggleTarget?.nombre}"?`}
        confirmLabel={toggleTarget?.estado === "Activo" ? "Desactivar" : "Activar"}
        variant={toggleTarget?.estado === "Activo" ? "danger" : "default"}
        onConfirm={() => {
          if (toggleTarget) {
            const nuevo: Estatus = toggleTarget.estado === "Activo" ? "Inactivo" : "Activo";
            setData((prev) =>
              prev.map((d) =>
                d.id === toggleTarget.id
                  ? {
                      ...d,
                      estado: nuevo,
                      fechaActualizacion: new Date().toISOString().slice(0, 10),
                    }
                  : d,
              ),
            );
          }
          setToggleTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar impuesto"
        message={`¿Estás seguro de eliminar el impuesto "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) setData((prev) => prev.filter((d) => d.id !== deleteTarget.id));
          setDeleteTarget(null);
        }}
      />

      {detail && <ImpuestoModal imp={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
