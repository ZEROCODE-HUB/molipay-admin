import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit3, Trash2, Eye, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, Label } from "@/components/portal-shell";
import { impuestosIniciales, type Impuesto, type Tasa, type Estatus } from "@/data/impuestos";

type ImpuestoForm = {
  id?: number;
  nombre: string;
  descripcion: string;
  tipoImpuesto: "Porcentaje" | "Fijo" | "Otro";
  estado: Estatus;
  tasas: Tasa[];
};

const blankForm: ImpuestoForm = {
  nombre: "",
  descripcion: "",
  tipoImpuesto: "Porcentaje",
  estado: "Activo",
  tasas: [],
};

export const Route = createFileRoute("/admin/modulos/impuestos/")({
  head: () => ({ meta: [{ title: "Impuestos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<Impuesto[]>(impuestosIniciales);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Impuesto | null>(null);
  const [detailTarget, setDetailTarget] = useState<Impuesto | null>(null);
  const [confirm, setConfirm] = useState<Impuesto | null>(null);
  const [form, setForm] = useState<ImpuestoForm>(blankForm);

  const openNew = () => {
    setForm(blankForm);
    setShowNew(true);
  };

  const openEdit = (imp: Impuesto) => {
    setForm({
      id: imp.id,
      nombre: imp.nombre,
      descripcion: imp.descripcion,
      tipoImpuesto: imp.tipoImpuesto,
      estado: imp.estado,
      tasas: imp.tasas.map((t) => ({ ...t })),
    });
    setEditTarget(imp);
  };

  const persist = () => {
    if (!form.nombre.trim()) return;
    if (editTarget) {
      setData((prev) =>
        prev.map((imp) =>
          imp.id === editTarget.id
            ? {
                ...imp,
                nombre: form.nombre,
                descripcion: form.descripcion,
                tipoImpuesto: form.tipoImpuesto,
                estado: form.estado,
                tasas: form.tasas,
                fechaActualizacion: new Date().toISOString().slice(0, 10),
              }
            : imp,
        ),
      );
    } else {
      const nextId = Math.max(0, ...data.map((d) => d.id)) + 1;
      setData((prev) => [
        {
          id: nextId,
          nombre: form.nombre,
          descripcion: form.descripcion,
          tipoImpuesto: form.tipoImpuesto,
          estado: form.estado,
          fechaCreacion: new Date().toISOString().slice(0, 10),
          fechaActualizacion: new Date().toISOString().slice(0, 10),
          tasas: form.tasas,
        },
        ...prev,
      ]);
    }
    setShowNew(false);
    setEditTarget(null);
  };

  const getActions = (imp: Impuesto): ActionItem[] => [
    { label: "Ver detalle", icon: Eye, onClick: () => setDetailTarget(imp) },
    { label: "Editar", icon: Edit3, onClick: () => openEdit(imp) },
    {
      label: "Eliminar",
      icon: Trash2,
      variant: "danger",
      onClick: () => setConfirm(imp),
    },
  ];

  const columns: Column<Impuesto>[] = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono tabular-nums text-xs">#{r.id}</span> },
    { key: "nombre", label: "Nombre", sortable: true, filterable: true, render: (r) => r.nombre },
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
    {
      key: "tasas",
      label: "Cantidad de tasas",
      sortable: true,
      render: (r) => <span className="font-mono tabular-nums font-semibold">{r.tasas.length}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Impuestos"
        description="Catálogo de tipos de impuestos de la plataforma y sus alícuotas."
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

      {(showNew || editTarget) && (
        <FormDialog
          open
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          title={editTarget ? "Editar impuesto" : "Nuevo impuesto"}
          description={
            editTarget ? `ID #${editTarget.id}` : "Definí el tipo de impuesto y sus tasas"
          }
          onSubmit={persist}
          submitLabel={editTarget ? "Guardar cambios" : "Crear impuesto"}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
                onChange={(e) =>
                  setForm({ ...form, tipoImpuesto: e.target.value as ImpuestoForm["tipoImpuesto"] })
                }
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
          </div>

          <div className="mt-5 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Tasas (alícuotas)</Label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    tasas: [
                      ...form.tasas,
                      { codigo: "", tasa: "", descripcion: "", estado: "Activo" },
                    ],
                  })
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Agregar tasa
              </button>
            </div>
            <div className="space-y-2">
              {form.tasas.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin tasas cargadas.</p>
              )}
              {form.tasas.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">Código</span>
                    <Input
                      value={t.codigo}
                      onChange={(e) => {
                        const next = [...form.tasas];
                        next[i] = { ...t, codigo: e.target.value };
                        setForm({ ...form, tasas: next });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">Tasa</span>
                    <Input
                      value={t.tasa}
                      onChange={(e) => {
                        const next = [...form.tasas];
                        next[i] = { ...t, tasa: e.target.value };
                        setForm({ ...form, tasas: next });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-muted-foreground">Descripción</span>
                    <Input
                      value={t.descripcion}
                      onChange={(e) => {
                        const next = [...form.tasas];
                        next[i] = { ...t, descripcion: e.target.value };
                        setForm({ ...form, tasas: next });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, tasas: form.tasas.filter((_, j) => j !== i) })
                    }
                    className="p-2 text-red-600 hover:opacity-70"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </FormDialog>
      )}

      {detailTarget && (
        <FormDialog
          open
          onClose={() => setDetailTarget(null)}
          title={detailTarget.nombre}
          description="Detalle del impuesto"
          onSubmit={() => setDetailTarget(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <Field label="ID" value={`#${detailTarget.id}`} />
            <Field label="Tipo de impuesto" value={detailTarget.tipoImpuesto} />
            <Field label="Estado" value={detailTarget.estado} />
            <Field label="Fecha de creación" value={detailTarget.fechaCreacion} />
            <Field label="Fecha de actualización" value={detailTarget.fechaActualizacion} />
            <Field label="Descripción" value={detailTarget.descripcion} />
          </div>
          <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Tasas (alícuotas)
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Tasa</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.tasas.map((t, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{t.codigo}</td>
                    <td className="px-3 py-2"><span className="font-mono tabular-nums">{t.tasa}</span></td>
                    <td className="px-3 py-2">{t.descripcion}</td>
                    <td className="px-3 py-2">
                      <Badge tone={t.estado === "Activo" ? "success" : "neutral"}>{t.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Eliminar impuesto"
        message={`¿Estás seguro de eliminar "${confirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirm) setData((prev) => prev.filter((d) => d.id !== confirm.id));
          setConfirm(null);
        }}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="font-medium">{value}</div>
    </div>
  );
}
