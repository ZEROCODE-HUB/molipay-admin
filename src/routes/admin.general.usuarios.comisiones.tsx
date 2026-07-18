import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { BtnPrimary, Badge, Input } from "@/components/portal-shell";
import { FormDialog } from "@/components/form-dialog";

export const Route = createFileRoute("/admin/general/usuarios/comisiones")({
  head: () => ({
    meta: [
      { title: "Carga de comisiones — Usuarios — Admin Molly" },
      { name: "description", content: "Gestión de comisiones asignadas a usuarios de la plataforma." },
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

const data: Comision[] = [
  { legajo: "COM-001", correo: "juan.perez@email.com", operacion: "DEP-2024-001", tipo: "Depósito", estado: "activa", monto: "$ 150,00", descripcion: "Comisión por depósito estándar" },
  { legajo: "COM-002", correo: "maria.lopez@email.com", operacion: "RET-2024-015", tipo: "Retiro", estado: "activa", monto: "$ 220,50", descripcion: "Comisión por retiro express" },
  { legajo: "COM-003", correo: "carlos.m@email.com", operacion: "LNK-2024-032", tipo: "Link de pago", estado: "inactiva", monto: "$ 75,00", descripcion: "Comisión por link de pago" },
  { legajo: "COM-004", correo: "ana.garcia@email.com", operacion: "ECO-2024-008", tipo: "E-commerce", estado: "activa", monto: "$ 340,00", descripcion: "Comisión por transacción e-commerce" },
  { legajo: "COM-005", correo: "pedro.rodriguez@email.com", operacion: "DEP-2024-056", tipo: "Depósito", estado: "activa", monto: "$ 95,00", descripcion: "Comisión por depósito prioritario" },
  { legajo: "COM-006", correo: "lucia.mendoza@email.com", operacion: "RET-2024-089", tipo: "Retiro", estado: "inactiva", monto: "$ 180,00", descripcion: "Comisión por retiro programado" },
  { legajo: "COM-007", correo: "gabriel.rios@email.com", operacion: "LNK-2024-112", tipo: "Link de pago", estado: "activa", monto: "$ 60,00", descripcion: "Comisión por link recurrente" },
];

const columns: Column<Comision>[] = [
  { key: "legajo", header: "Legajo" },
  { key: "correo", header: "Correo" },
  { key: "operacion", header: "Operación" },
  { key: "tipo", header: "Tipo" },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => (
      <Badge tone={row.estado === "activa" ? "success" : "danger"}>
        {row.estado === "activa" ? "Activa" : "Inactiva"}
      </Badge>
    ),
  },
  { key: "monto", header: "Monto" },
  { key: "descripcion", header: "Descripción" },
  {
    key: "accion",
    header: "Acción",
    cell: () => (
      <span className="text-xs text-primary cursor-pointer hover:underline">Editar</span>
    ),
  },
];

function ComisionesPage() {
  const [showNueva, setShowNueva] = useState(false);

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

      <DataTable columns={columns} data={data} />

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
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Email de usuario</label>
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
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Valor numérico</label>
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
    </>
  );
}
