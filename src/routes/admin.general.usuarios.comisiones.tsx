import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Eye, Edit3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtnPrimary, BtnOutline, Badge, Input } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";

export const Route = createFileRoute("/admin/general/usuarios/comisiones")({
  head: () => ({
    meta: [
      { title: "Carga de comisiones — Usuarios — Admin Molly" },
      {
        name: "description",
        content: "Gestión de comisiones asignadas a usuarios de la plataforma.",
      },
    ],
  }),
  component: ComisionesPage,
});

type Comision = {
  legajo: string;
  correo: string;
  operacion: string;
  tipo: string;
  estado: "activa" | "inactiva";
  monto: string;
  descripcion: string;
};

const initialData: Comision[] = [
  {
    legajo: "COM-001",
    correo: "juan.perez@email.com",
    operacion: "DEP-2024-001",
    tipo: "Depósito",
    estado: "activa",
    monto: "$ 150,00",
    descripcion: "Comisión por depósito estándar",
  },
  {
    legajo: "COM-002",
    correo: "maria.lopez@email.com",
    operacion: "RET-2024-015",
    tipo: "Retiro",
    estado: "activa",
    monto: "$ 220,50",
    descripcion: "Comisión por retiro express",
  },
  {
    legajo: "COM-003",
    correo: "carlos.m@email.com",
    operacion: "LNK-2024-032",
    tipo: "Link de pago",
    estado: "inactiva",
    monto: "$ 75,00",
    descripcion: "Comisión por link de pago",
  },
  {
    legajo: "COM-004",
    correo: "ana.garcia@email.com",
    operacion: "ECO-2024-008",
    tipo: "E-commerce",
    estado: "activa",
    monto: "$ 340,00",
    descripcion: "Comisión por transacción e-commerce",
  },
  {
    legajo: "COM-005",
    correo: "pedro.rodriguez@email.com",
    operacion: "DEP-2024-056",
    tipo: "Depósito",
    estado: "activa",
    monto: "$ 95,00",
    descripcion: "Comisión por depósito prioritario",
  },
  {
    legajo: "COM-006",
    correo: "lucia.mendoza@email.com",
    operacion: "RET-2024-089",
    tipo: "Retiro",
    estado: "inactiva",
    monto: "$ 180,00",
    descripcion: "Comisión por retiro programado",
  },
  {
    legajo: "COM-007",
    correo: "gabriel.rios@email.com",
    operacion: "LNK-2024-112",
    tipo: "Link de pago",
    estado: "activa",
    monto: "$ 60,00",
    descripcion: "Comisión por link recurrente",
  },
];

function ComisionesPage() {
  const [data, setData] = useState<Comision[]>(initialData);
  const [showNueva, setShowNueva] = useState(false);
  const [viewing, setViewing] = useState<Comision | null>(null);
  const [editTarget, setEditTarget] = useState<Comision | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const getActions = (row: Comision): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setViewing(row) },
    { label: "Editar", icon: Edit3, onClick: () => setEditTarget({ ...row }) },
    ...(row.estado === "activa"
      ? [
          {
            label: "Desactivar",
            icon: XCircle,
            variant: "danger" as const,
            onClick: () =>
              setConfirmAction({
                title: "Desactivar comisión",
                message: `¿Estás seguro de desactivar la comisión ${row.legajo}?`,
                confirmLabel: "Desactivar",
                variant: "danger",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((c) => (c.legajo === row.legajo ? { ...c, estado: "inactiva" } : c)),
                  ),
              }),
          },
        ]
      : [
          {
            label: "Activar",
            icon: Eye,
            onClick: () =>
              setConfirmAction({
                title: "Activar comisión",
                message: `¿Estás seguro de activar la comisión ${row.legajo}?`,
                confirmLabel: "Activar",
                variant: "default",
                onConfirm: () =>
                  setData((prev) =>
                    prev.map((c) => (c.legajo === row.legajo ? { ...c, estado: "activa" } : c)),
                  ),
              }),
          },
        ]),
  ];

  return (
    <>
      <PageHeader
        title="Carga de comisiones"
        description="Administración de comisiones aplicadas a usuarios."
        action={
          <BtnPrimary onClick={() => setShowNueva(true)}>
            <Plus size={16} />
            Nueva comisión
          </BtnPrimary>
        }
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
          title="Detalle de comisión"
          description={`Comisión ${viewing.legajo}`}
          onSubmit={() => setViewing(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Legajo:</span>{" "}
              <span className="font-medium">{viewing.legajo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Correo:</span>{" "}
              <span className="font-medium">{viewing.correo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Operación:</span>{" "}
              <span className="font-medium">{viewing.operacion}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              <span className="font-medium">{viewing.tipo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">
                {viewing.estado === "activa" ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Monto:</span>{" "}
              <span className="font-medium">{viewing.monto}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Descripción:</span>{" "}
              <span className="font-medium">{viewing.descripcion}</span>
            </div>
          </div>
        </FormDialog>
      )}

      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar comisión"
          description={`Editando comisión ${editTarget.legajo}`}
          onSubmit={() => {
            setData((prev) => prev.map((c) => (c.legajo === editTarget.legajo ? editTarget : c)));
            setEditTarget(null);
          }}
          submitLabel="Guardar cambios"
          size="lg"
        >
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Monto</label>
            <Input
              value={editTarget.monto}
              onChange={(e) => setEditTarget({ ...editTarget, monto: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Descripción
            </label>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring resize-none"
              value={editTarget.descripcion}
              onChange={(e) => setEditTarget({ ...editTarget, descripcion: e.target.value })}
            />
          </div>
        </FormDialog>
      )}

      <FormDialog
        open={showNueva}
        onClose={() => setShowNueva(false)}
        title="Nueva comisión"
        description="Asignar una nueva comisión a un usuario."
        onSubmit={() => setShowNueva(false)}
        submitLabel="Crear comisión"
        size="lg"
      >
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Email de usuario
          </label>
          <Input placeholder="usuario@email.com" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Tipo</label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring">
            <option>Depósito</option>
            <option>Retiro</option>
            <option>Link de pago</option>
            <option>E-commerce</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Modo</label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring">
            <option>Fijo</option>
            <option>Porcentaje</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Valor numérico
          </label>
          <Input type="number" step="0.01" placeholder="250.00" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Descripción</label>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-md border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring resize-none"
            placeholder="Detalle de la comisión..."
          />
        </div>
      </FormDialog>

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
    </>
  );
}

const columns: Column<Comision>[] = [
  { key: "legajo", label: "Legajo", render: (r) => r.legajo },
  { key: "correo", label: "Correo", render: (r) => r.correo },
  { key: "operacion", label: "Operación", render: (r) => r.operacion },
  { key: "tipo", label: "Tipo", render: (r) => r.tipo },
  {
    key: "estado",
    label: "Estado",
    render: (row) => (
      <Badge tone={row.estado === "activa" ? "success" : "danger"}>
        {row.estado === "activa" ? "Activa" : "Inactiva"}
      </Badge>
    ),
  },
  { key: "monto", label: "Monto", render: (r) => r.monto },
  { key: "descripcion", label: "Descripción", render: (r) => r.descripcion },
];
