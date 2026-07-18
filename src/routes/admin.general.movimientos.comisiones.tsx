import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/comisiones")({
  head: () => ({
    meta: [
      { title: "Cobro de comisiones — Movimientos — Admin Molly" },
      { name: "description", content: "Comisiones cobradas por la plataforma Molly Money Life." },
    ],
  }),
  component: ComisionesPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-003", id: "TXN-003", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 12.500,00", fecha: "14/01/2025 09:15", estado: "Aprobada" },
  { legajo: "MOV-012", id: "TXN-012", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 5.000,00", fecha: "11/01/2025 11:20", estado: "Rechazada" },
];

function ComisionesPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Cobro de comisiones"
        description="Comisiones debitadas a usuarios por operaciones en la plataforma."
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
