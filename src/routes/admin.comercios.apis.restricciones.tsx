import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { PageHeader, Badge, Input, Label, BtnPrimary } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/admin/comercios/apis/restricciones")({
  component: Page,
  head: () => ({
    meta: [{ title: "APIs externas — Restricciones — Admin — Moli" }],
  }),
});

type EstadoRestriccion = "Restringiendo" | "No restringiendo";

type Restriccion = {
  id: number;
  email: string;
  legajo: string;
  nombreCompleto: string;
  estado: EstadoRestriccion;
  fechaCreacion: string;
  fechaExpiracion: string;
};

type RestriccionForm = Omit<Restriccion, "id">;

const dataInicial: Restriccion[] = [
  {
    id: 1,
    email: "usuario1@correo.com",
    legajo: "1001",
    nombreCompleto: "Juan Pérez",
    estado: "Restringiendo",
    fechaCreacion: "2026-03-01 10:12",
    fechaExpiracion: "2026-09-01",
  },
  {
    id: 2,
    email: "usuario2@correo.com",
    legajo: "1002",
    nombreCompleto: "María López",
    estado: "Restringiendo",
    fechaCreacion: "2026-04-15 14:30",
    fechaExpiracion: "2026-10-15",
  },
  {
    id: 3,
    email: "usuario3@correo.com",
    legajo: "1003",
    nombreCompleto: "Carlos Gómez",
    estado: "No restringiendo",
    fechaCreacion: "2026-05-02 09:05",
    fechaExpiracion: "2026-11-02",
  },
  {
    id: 4,
    email: "usuario4@correo.com",
    legajo: "1004",
    nombreCompleto: "Romina Díaz",
    estado: "Restringiendo",
    fechaCreacion: "2026-06-10 16:45",
    fechaExpiracion: "2026-12-10",
  },
];

function Page() {
  const [data, setData] = useState<Restriccion[]>(dataInicial);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Restriccion | null>(null);
  const [form, setForm] = useState<RestriccionForm>({
    email: "",
    legajo: "",
    nombreCompleto: "",
    estado: "Restringiendo",
    fechaCreacion: "",
    fechaExpiracion: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<Restriccion | null>(null);

  const openNew = () => {
    setEditTarget(null);
    setForm({
      email: "",
      legajo: "",
      nombreCompleto: "",
      estado: "Restringiendo",
      fechaCreacion: "",
      fechaExpiracion: "",
    });
    setShowForm(true);
  };

  const openEdit = (r: Restriccion) => {
    setEditTarget(r);
    setForm({
      email: r.email,
      legajo: r.legajo,
      nombreCompleto: r.nombreCompleto,
      estado: r.estado,
      fechaCreacion: r.fechaCreacion,
      fechaExpiracion: r.fechaExpiracion,
    });
    setShowForm(true);
  };

  const guardar = () => {
    if (!form.email.trim() || !form.legajo.trim() || !form.nombreCompleto.trim()) return;
    if (editTarget) {
      setData((prev) =>
        prev.map((r) => (r.id === editTarget.id ? { ...form, id: editTarget.id } : r)),
      );
    } else {
      const id = Math.max(0, ...data.map((r) => r.id)) + 1;
      setData((prev) => [...prev, { ...form, id }]);
    }
    setShowForm(false);
  };

  const getActions = (r: Restriccion): ActionItem[] => [
    { label: "Editar", icon: Edit3, onClick: () => openEdit(r) },
    { label: "Eliminar", icon: Trash2, onClick: () => setConfirmDelete(r) },
  ];

  const columns: Column<Restriccion>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium">{r.email}</span>,
    },
    {
      key: "legajo",
      label: "Legajo",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-mono tabular-nums text-xs">#{r.legajo}</span>,
    },
    {
      key: "nombreCompleto",
      label: "Nombre completo",
      sortable: true,
      filterable: true,
      render: (r) => r.nombreCompleto,
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      filterable: "enum",
      filterOptions: ["Restringiendo", "No restringiendo"],
      render: (r) => (
        <Badge tone={r.estado === "Restringiendo" ? "danger" : "neutral"}>{r.estado}</Badge>
      ),
    },
    {
      key: "fechaCreacion",
      label: "Fecha de creación",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaCreacion}</span>,
    },
    {
      key: "fechaExpiracion",
      label: "Fecha de expiración",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono tabular-nums">{r.fechaExpiracion}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Restricciones"
        description="Restricciones de usuarios de API."
        action={
          <BtnPrimary type="button" onClick={openNew}>
            <Plus size={16} /> Nueva restricción
          </BtnPrimary>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        pageSize={10}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      <FormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? "Editar restricción" : "Nueva restricción"}
        description={
          editTarget
            ? `Configuración de la restricción de "${editTarget.nombreCompleto}".`
            : "Definí los datos del usuario y la vigencia de la restricción."
        }
        onSubmit={guardar}
        submitLabel={editTarget ? "Guardar cambios" : "Crear restricción"}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="re-email">Email</Label>
            <Input
              id="re-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@correo.com"
            />
          </div>
          <div>
            <Label htmlFor="re-legajo">Legajo</Label>
            <Input
              id="re-legajo"
              value={form.legajo}
              onChange={(e) => setForm({ ...form, legajo: e.target.value })}
              placeholder="1001"
            />
          </div>
          <div>
            <Label htmlFor="re-nombre">Nombre completo</Label>
            <Input
              id="re-nombre"
              value={form.nombreCompleto}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <Label htmlFor="re-estado">Estado</Label>
            <select
              id="re-estado"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoRestriccion })}
            >
              <option value="Restringiendo">Restringiendo</option>
              <option value="No restringiendo">No restringiendo</option>
            </select>
          </div>
          <div>
            <Label htmlFor="re-creacion">Fecha de creación</Label>
            <Input
              id="re-creacion"
              value={form.fechaCreacion}
              onChange={(e) => setForm({ ...form, fechaCreacion: e.target.value })}
              placeholder="2026-03-01 10:12"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="re-expiracion">Fecha de expiración</Label>
            <Input
              id="re-expiracion"
              value={form.fechaExpiracion}
              onChange={(e) => setForm({ ...form, fechaExpiracion: e.target.value })}
              placeholder="2026-09-01"
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar restricción"
        message={`¿Estás seguro de eliminar la restricción de "${confirmDelete?.nombreCompleto}" (${confirmDelete?.email})? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) setData((prev) => prev.filter((r) => r.id !== confirmDelete.id));
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
