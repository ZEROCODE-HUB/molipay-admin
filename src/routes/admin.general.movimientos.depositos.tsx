import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — Movimientos — Admin Molly" },
      { name: "description", content: "Depósitos realizados en la plataforma Moli." },
    ],
  }),
  component: DepositosPage,
});

const data: Movimiento[] = [
  {
    legajo: "MOV-001",
    id: "TXN-001",
    tipo: "Depósito",
    cvu: "0000003100087654321012",
    usuario: "juan.perez@email.com",
    nombreOrigen: "Juan Carlos Pérez",
    nombreDestino: "Moli SA",
    cuit: "20-12345678-9",
    monto: "$ 150.000,00",
    fecha: "15/01/2025 10:32",
    estado: "Aprobada",
  },
  {
    legajo: "MOV-004",
    id: "TXN-004",
    tipo: "Depósito",
    cvu: "0000003100087654321045",
    usuario: "ana.garcia@email.com",
    nombreOrigen: "Ana Sofía García",
    nombreDestino: "Moli SA",
    cuit: "27-45678901-2",
    monto: "$ 320.000,00",
    fecha: "14/01/2025 14:22",
    estado: "Aprobada",
  },
  {
    legajo: "MOV-010",
    id: "TXN-010",
    tipo: "Depósito",
    cvu: "0000003100087654321012",
    usuario: "juan.perez@email.com",
    nombreOrigen: "Juan Carlos Pérez",
    nombreDestino: "Moli SA",
    cuit: "20-12345678-9",
    monto: "$ 500.000,00",
    fecha: "12/01/2025 09:00",
    estado: "Aprobada",
  },
];

function DepositosPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Depósitos"
        description="Transacciones de depósito ingresadas a la plataforma."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

const columns: Column<Movimiento>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span> },
  { key: "id", label: "ID", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.id}</span> },
  { key: "cvu", label: "CVU/CBU", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.cvu}</span> },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre completo",
    filterable: true,
    render: (r) => r.nombreOrigen,
  },
  { key: "nombreDestino", label: "Destino", filterable: true, render: (r) => r.nombreDestino },
  { key: "cuit", label: "CUIT destino", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span> },
  { key: "monto", label: "Monto", render: (r) => <span className="font-mono tabular-nums">{r.monto}</span> },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span> },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["Aprobada", "Pendiente", "Rechazada", "Bloqueado"],
    render: (row) => estadoBadge(row.estado),
  },
];
