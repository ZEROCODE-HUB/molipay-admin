import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/pagos-qr")({
  head: () => ({
    meta: [
      { title: "Pagos QR — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos realizados mediante código QR en la plataforma Molly Money Life." },
    ],
  }),
  component: PagosQrPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-008", id: "TXN-008", tipo: "Pagos QR", cvu: "0000003100087654321089", email: "valentina.castro@email.com", nombreOrigen: "Valentina Castro", nombreDestino: "Supermercado El Colono", cuit: "30-89012345-6", monto: "$ 3.750,00", fecha: "13/01/2025 12:15", estado: "Aprobada" },
];

function PagosQrPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Pagos QR"
        description="Pagos iniciados por el usuario mediante escaneo de código QR."
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
