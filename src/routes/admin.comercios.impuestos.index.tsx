import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, Label } from "@/components/portal-shell";
import { impuestosIniciales, type Impuesto, type Estatus } from "@/data/impuestos";

type TipoImpuesto = Impuesto["tipoImpuesto"];

type ImpuestoForm = {
  nombre: string;
  descripcion: string;
  tipoImpuesto: TipoImpuesto;
  monto: string;
  estado: Estatus;
};

const blankForm: ImpuestoForm = {
  nombre: "",
  descripcion: "",
  tipoImpuesto: "Porcentaje",
  monto: "",
  estado: "Activo",
};

function formatMonto(imp: Impuesto) {
  if (imp.monto === null) return "—";
  return imp.tipoImpuesto === "Porcentaje"
    ? `${imp.monto}%`
    : `$ ${imp.monto.toLocaleString("es-AR")}`;
}

export const Route = createFileRoute("/admin/comercios/impuestos/")({
  head: () => ({ meta: [{ title: "Impuestos — Admin — Moli" }] }),
  component: Page,
});

function Page() {
  const [data, setData] = useState<Impuesto[]>(impuestosIniciales);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<ImpuestoForm>(blankForm);
  const [confirm, setConfirm] = useState<Impuesto | null>(null);

  const openNew = () => {
    setForm(blankForm);
    setShowNew(true);
  };

  const necesitaMonto = form.tipoImpuesto === "Porcentaje" || form.tipoImpuesto === "Fijo";
  const montoValido = !necesitaMonto || (form.monto.trim() !== "" && Number(form.monto) > 0);
  const formValido = form.nombre.trim() !== "" && montoValido;

  const persist = () => {
    if (!formValido) return;
    const nextId = Math.max(0, ...data.map((d) => d.id)) + 1;
    setData((prev) => [
      {
        id: nextId,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        tipoImpuesto: form.tipoImpuesto,
        monto: necesitaMonto ? Number(form.monto) : null,
        estado: form.estado,
        fechaCreacion: new Date().toISOString().slice(0, 10),
        fechaActualizacion: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setShowNew(false);
    setForm(blankForm);
  };

  const getActions = (imp: Impuesto): ActionItem[] =>
    imp.estado === "Activo"
      ? [
          {
            label: "Desactivar",
            icon: PowerOff,
            variant: "danger",
            onClick: () => setConfirm(imp),
          },
        ]
      : [
          {
            label: "Activar",
            icon: Power,
            onClick: () => setConfirm(imp),
          },
        ];

  const columns: Column<Impuesto>[] = [
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      filterable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{r.id}</span>
          <span className="font-medium">{r.nombre}</span>
        </div>
      ),
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

      {showNew && (
        <FormDialog
          open
          onClose={() => setShowNew(false)}
          title="Nuevo impuesto"
          description="Definí el tipo de impuesto y su monto."
          onSubmit={persist}
          submitLabel="Crear impuesto"
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
              Completá el nombre {necesitaMonto ? "y el monto" : ""} para poder guardar.
            </p>
          )}
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.estado === "Activo" ? "Desactivar impuesto" : "Activar impuesto"}
        message={`¿Estás seguro de ${confirm?.estado === "Activo" ? "desactivar" : "activar"} el impuesto "${confirm?.nombre}"?`}
        confirmLabel={confirm?.estado === "Activo" ? "Desactivar" : "Activar"}
        variant={confirm?.estado === "Activo" ? "danger" : "default"}
        onConfirm={() => {
          if (confirm) {
            const nuevo: Estatus = confirm.estado === "Activo" ? "Inactivo" : "Activo";
            setData((prev) =>
              prev.map((d) =>
                d.id === confirm.id
                  ? {
                      ...d,
                      estado: nuevo,
                      fechaActualizacion: new Date().toISOString().slice(0, 10),
                    }
                  : d,
              ),
            );
          }
          setConfirm(null);
        }}
      />
    </>
  );
}
