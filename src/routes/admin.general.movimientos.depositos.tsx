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
      { name: "description", content: "Depósitos realizados en la plataforma Molly Money Life." },
    ],
  }),
  component: DepositosPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-001", id: "TXN-001", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 150.000,00", fecha: "15/01/2025 10:32", estado: "Aprobada" },
  { legajo: "MOV-004", id: "TXN-004", tipo: "Depósito", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Molly Money Life SA", cuit: "27-45678901-2", monto: "$ 320.000,00", fecha: "14/01/2025 14:22", estado: "Aprobada" },
  { legajo: "MOV-010", id: "TXN-010", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 500.000,00", fecha: "12/01/2025 09:00", estado: "Aprobada" },
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
  { key: "legajo", label: "Legajo", render: (r) => r.legajo },
  { key: "id", label: "ID", render: (r) => r.id },
  { key: "cvu", label: "CVU", render: (r) => r.cvu },
  { key: "email", label: "Email", render: (r) => r.email },
  { key: "nombreOrigen", label: "Origen", render: (r) => r.nombreOrigen },
  { key: "nombreDestino", label: "Destino", render: (r) => r.nombreDestino },
  { key: "cuit", label: "CUIT", render: (r) => r.cuit },
  { key: "monto", label: "Monto", render: (r) => r.monto },
  { key: "fecha", label: "Fecha", render: (r) => r.fecha },
  { key: "estado", label: "Estado", render: (row) => estadoBadge(row.estado) },
];
