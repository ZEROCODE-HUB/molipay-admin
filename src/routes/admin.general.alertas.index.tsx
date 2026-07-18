import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Edit3 } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { Badge, Input } from "@/components/portal-shell";

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

  const columns: Column<Alerta>[] = [
    { key: "legajo", header: "Legajo" },
    { key: "correo", header: "Correo" },
    { key: "nombre", header: "Nombre" },
    { key: "tipo", header: "Tipo de alerta" },
    {
      key: "estado",
      header: "Estado",
      render: (row) => {
        const tone = row.estado === "Resuelto" ? "success" : row.estado === "Revisado" ? "neutral" : "warn";
        return <Badge tone={tone}>{row.estado}</Badge>;
      },
    },
    {
      key: "activo",
      header: "Activo",
      render: (row) => (
        <Badge tone={row.activo === "Sí" ? "success" : "danger"}>{row.activo}</Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: () => (
        <button className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
          <Edit3 size={12} /> Editar
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por legajo, correo o nombre..." />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>
      <DataTable columns={columns} data={MOCK} keyExtractor={(r) => r.legajo} />
    </div>
  );
}
