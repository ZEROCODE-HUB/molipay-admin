import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Edit3, XCircle, CheckCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, PageHeader } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/alertas/")({
  head: () => ({
    meta: [{ title: "Listado de alertas — Admin" }],
  }),
  component: ListadoAlertas,
});

type Alerta = {
  legajo: string;
  correo: string;
  nombre: string;
  tipo: string;
  estado: string;
  activo: string;
};

const initialData: Alerta[] = [
  {
    legajo: "LEG-001",
    correo: "jperez@empresa.com",
    nombre: "Juan Pérez",
    tipo: "Depósito excedido",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-002",
    correo: "mgarcia@corp.com",
    nombre: "María García",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "Sí",
  },
  {
    legajo: "LEG-003",
    correo: "clopez@firm.com",
    nombre: "Carlos López",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "No",
  },
  {
    legajo: "LEG-004",
    correo: "lrodriguez@sa.com",
    nombre: "Laura Rodríguez",
    tipo: "Horario inusual",
    estado: "Resuelto",
    activo: "Sí",
  },
  {
    legajo: "LEG-005",
    correo: "mfernandez@corp.com",
    nombre: "Martín Fernández",
    tipo: "Volumen anormal",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-006",
    correo: "gmartinez@firm.com",
    nombre: "Gabriela Martínez",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "No",
  },
  {
    legajo: "LEG-007",
    correo: "dperez@sa.com",
    nombre: "Diego Pérez",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-008",
    correo: "agonzalez@corp.com",
    nombre: "Ana González",
    tipo: "Horario inusual",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-009",
    correo: "rmendoza@firm.com",
    nombre: "Roberto Mendoza",
    tipo: "Intento fallido",
    estado: "Revisado",
    activo: "Sí",
  },
  {
    legajo: "LEG-010",
    correo: "csuarez@empresa.com",
    nombre: "Camila Suárez",
    tipo: "Depósito excedido",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-011",
    correo: "fcastro@corp.com",
    nombre: "Federico Castro",
    tipo: "Transferencia repetida",
    estado: "Pendiente",
    activo: "Sí",
  },
  {
    legajo: "LEG-012",
    correo: "vmolina@firm.com",
    nombre: "Valentina Molina",
    tipo: "Horario inusual",
    estado: "Resuelto",
    activo: "No",
  },
];

function ListadoAlertas() {
  const [data, setData] = useState(initialData);
  const [viewing, setViewing] = useState<Alerta | null>(null);
  const [editTarget, setEditTarget] = useState<Alerta | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Alerta): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    {
      label: row.activo === "Sí" ? "Desactivar" : "Activar",
      icon: row.activo === "Sí" ? XCircle : CheckCircle,
      onClick: () =>
        setConfirmAction({
          title: row.activo === "Sí" ? "Desactivar alerta" : "Activar alerta",
          message: `¿Estás seguro de ${row.activo === "Sí" ? "desactivar" : "activar"} la alerta de ${row.nombre}?`,
          confirmLabel: row.activo === "Sí" ? "Desactivar" : "Activar",
          variant: row.activo === "Sí" ? "danger" : "default",
          onConfirm: () =>
            setData((prev) =>
              prev.map((a) =>
                a.legajo === row.legajo ? { ...a, activo: row.activo === "Sí" ? "No" : "Sí" } : a,
              ),
            ),
        }),
    },
  ];

  const columns: Column<Alerta>[] = [
    { key: "legajo", label: "Legajo", filterable: true, render: (r) => r.legajo },
    { key: "correo", label: "Correo", filterable: true, render: (r) => r.correo },
    { key: "nombre", label: "Nombre", filterable: true, render: (r) => r.nombre },
    { key: "tipo", label: "Tipo de alerta", filterable: true, render: (r) => r.tipo },
    {
      key: "estado",
      label: "Estado",
      filterable: "enum", filterOptions: ["Pendiente", "Revisado", "Resuelto"],
      render: (row) => {
        const tone =
          row.estado === "Resuelto" ? "success" : row.estado === "Revisado" ? "neutral" : "warn";
        return <Badge tone={tone}>{row.estado}</Badge>;
      },
    },
    {
      key: "activo",
      label: "Activo",
      filterable: "enum", filterOptions: ["Sí", "No"],
      render: (row) => (
        <Badge tone={row.activo === "Sí" ? "success" : "danger"}>{row.activo}</Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listado de alertas"
        description="Alertas generadas por el sistema de monitoreo."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />

      {viewing && (
        <FormDialog
          open={!!viewing}
          onClose={() => setViewing(null)}
          title="Detalle de alerta"
          description={`Alerta de ${viewing.nombre}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium">{viewing.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{viewing.nombre}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              <span className="font-medium">{viewing.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">{viewing.estado}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Activo:</span>{" "}
              <span className="font-medium">{viewing.activo}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar alerta"
          description={`Editando alerta de ${editTarget.nombre}`}
          onSubmit={() => {
            setData((prev) => prev.map((a) => (a.legajo === editTarget.legajo ? editTarget : a)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Estado</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
              value={editTarget.estado}
              onChange={(e) => setEditTarget({ ...editTarget, estado: e.target.value })}
            >
              <option>Pendiente</option>
              <option>Revisado</option>
              <option>Resuelto</option>
            </select>
          </div>
        </FormDialog>
      )}

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
    </div>
  );
}
