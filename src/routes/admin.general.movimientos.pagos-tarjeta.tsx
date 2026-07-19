import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/pagos-tarjeta")({
  head: () => ({
    meta: [
      { title: "Pagos con tarjeta — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos realizados con tarjeta a través de la plataforma Molly Money Life." },
    ],
  }),
  component: PagosTarjetaPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-007", id: "TXN-007", tipo: "Pagos con tarjeta", cvu: "0000003100087654321078", email: "gabriel.rios@email.com", nombreOrigen: "Gabriel Esteban Ríos", nombreDestino: "Mercado Pago", cuit: "20-78901234-5", monto: "$ 22.400,00", fecha: "13/01/2025 10:00", estado: "Aprobada" },
  { legajo: "MOV-013", id: "TXN-013", tipo: "Pagos con tarjeta", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Netflix Argentina", cuit: "30-01234567-8", monto: "$ 12.499,00", fecha: "10/01/2025 20:15", estado: "Aprobada" },
];

function PagosTarjetaPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Pagos con tarjeta"
        description="Transacciones realizadas con tarjeta de crédito o débito."
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
