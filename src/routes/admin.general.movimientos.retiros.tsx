import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros — Movimientos — Admin Molly" },
      { name: "description", content: "Retiros realizados desde la plataforma Molly Money Life." },
    ],
  }),
  component: RetirosPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-002", id: "TXN-002", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Provincia CC", cuit: "27-23456789-0", monto: "$ 45.200,00", fecha: "15/01/2025 11:05", estado: "Pendiente" },
  { legajo: "MOV-005", id: "TXN-005", tipo: "Retiro", cvu: "0000003100087654321056", email: "pedro.rodriguez@email.com", nombreOrigen: "Pedro Antonio Rodríguez", nombreDestino: "Banco Nación CA", cuit: "20-56789012-3", monto: "$ 78.900,00", fecha: "14/01/2025 16:48", estado: "Rechazada" },
  { legajo: "MOV-011", id: "TXN-011", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Galicia CC", cuit: "27-23456789-0", monto: "$ 15.600,00", fecha: "11/01/2025 15:30", estado: "Aprobada" },
];

function RetirosPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Retiros"
        description="Transacciones de retiro desde la plataforma hacia cuentas externas."
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
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => r.legajo },
  { key: "id", label: "ID", filterable: true, render: (r) => r.id },
  { key: "cvu", label: "CVU", filterable: true, render: (r) => r.cvu },
  { key: "email", label: "Email", filterable: true, render: (r) => r.email },
  { key: "nombreOrigen", label: "Origen", filterable: true, render: (r) => r.nombreOrigen },
  { key: "nombreDestino", label: "Destino", filterable: true, render: (r) => r.nombreDestino },
  { key: "cuit", label: "CUIT", filterable: true, render: (r) => r.cuit },
  { key: "monto", label: "Monto", filterable: true, render: (r) => r.monto },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => r.fecha },
  { key: "estado", label: "Estado", filterable: true, render: (row) => estadoBadge(row.estado) },
];
