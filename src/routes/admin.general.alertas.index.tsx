import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Eye, Edit3, XCircle, CheckCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { Badge, Input, PageHeader } from "@/components/portal-shell";

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

const MOCK: Alerta[] = [
  { legajo: "LEG-001", correo: "jperez@empresa.com", nombre: "Juan Pérez", tipo: "Depósito excedido", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-002", correo: "mgarcia@corp.com", nombre: "María García", tipo: "Intento fallido", estado: "Revisado", activo: "Sí" },
  { legajo: "LEG-003", correo: "clopez@firm.com", nombre: "Carlos López", tipo: "Transferencia repetida", estado: "Pendiente", activo: "No" },
  { legajo: "LEG-004", correo: "lrodriguez@sa.com", nombre: "Laura Rodríguez", tipo: "Horario inusual", estado: "Resuelto", activo: "Sí" },
  { legajo: "LEG-005", correo: "mfernandez@corp.com", nombre: "Martín Fernández", tipo: "Volumen anormal", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-006", correo: "gmartinez@firm.com", nombre: "Gabriela Martínez", tipo: "Intento fallido", estado: "Revisado", activo: "No" },
  { legajo: "LEG-007", correo: "dperez@sa.com", nombre: "Diego Pérez", tipo: "Transferencia repetida", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-008", correo: "agonzalez@corp.com", nombre: "Ana González", tipo: "Horario inusual", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-009", correo: "rmendoza@firm.com", nombre: "Roberto Mendoza", tipo: "Intento fallido", estado: "Revisado", activo: "Sí" },
  { legajo: "LEG-010", correo: "csuarez@empresa.com", nombre: "Camila Suárez", tipo: "Depósito excedido", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-011", correo: "fcastro@corp.com", nombre: "Federico Castro", tipo: "Transferencia repetida", estado: "Pendiente", activo: "Sí" },
  { legajo: "LEG-012", correo: "vmolina@firm.com", nombre: "Valentina Molina", tipo: "Horario inusual", estado: "Resuelto", activo: "No" },
];

function ListadoAlertas() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getActions = (row: Alerta): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => {} },
    { label: "Editar", icon: Edit3, onClick: () => {} },
    { label: row.activo === "Sí" ? "Desactivar" : "Activar", icon: row.activo === "Sí" ? XCircle : CheckCircle, onClick: () => {} },
  ];

  const columns: Column<Alerta>[] = [
    { key: "legajo", label: "Legajo", render: (r) => r.legajo },
    { key: "correo", label: "Correo", render: (r) => r.correo },
    { key: "nombre", label: "Nombre", render: (r) => r.nombre },
    { key: "tipo", label: "Tipo de alerta", render: (r) => r.tipo },
    {
      key: "estado",
      label: "Estado",
      render: (row) => {
        const tone = row.estado === "Resuelto" ? "success" : row.estado === "Revisado" ? "neutral" : "warn";
        return <Badge tone={tone}>{row.estado}</Badge>;
      },
    },
    {
      key: "activo",
      label: "Activo",
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por legajo, correo o nombre..." />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>
      <DataTable
        columns={columns}
        data={MOCK}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
    </div>
  );
}
