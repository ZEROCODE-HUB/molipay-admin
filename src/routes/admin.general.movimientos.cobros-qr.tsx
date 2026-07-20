import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/cobros-qr")({
  head: () => ({
    meta: [
      { title: "Cobros QR — Movimientos — Admin Molly" },
      { name: "description", content: "Cobros realizados mediante código QR en la plataforma Molly Money Life." },
    ],
  }),
  component: CobrosQrPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-009", id: "TXN-009", tipo: "Cobros QR", cvu: "0000003100087654321090", email: "diego.fernandez@email.com", nombreOrigen: "Diego Martín Fernández", nombreDestino: "Kiosco 24hs", cuit: "27-90123456-7", monto: "$ 1.200,00", fecha: "12/01/2025 18:45", estado: "Pendiente" },
];

function CobrosQrPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Cobros QR"
        description="Cobros generados por el comercio mediante código QR para que el usuario escanee."
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
  { key: "monto", label: "Monto", render: (r) => r.monto },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => r.fecha },
  { key: "estado", label: "Estado", filterable: "enum", filterOptions: ["Aprobada", "Pendiente", "Rechazada"], render: (row) => estadoBadge(row.estado) },
];
