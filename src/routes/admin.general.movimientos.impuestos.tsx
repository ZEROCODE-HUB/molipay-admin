import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/impuestos")({
  head: () => ({
    meta: [
      { title: "Impuestos cobrados — Movimientos — Admin Molly" },
      { name: "description", content: "Impuestos cobrados a través de la plataforma Molly Money Life." },
    ],
  }),
  component: ImpuestosPage,
});

const data: Movimiento[] = [
  { legajo: "MOV-006", id: "TXN-006", tipo: "Impuestos cobrados", cvu: "0000003100087654321067", email: "lucia.mendoza@email.com", nombreOrigen: "Lucía Belén Mendoza", nombreDestino: "AFIP", cuit: "27-67890123-4", monto: "$ 8.250,00", fecha: "13/01/2025 08:30", estado: "Aprobada" },
  { legajo: "MOV-014", id: "TXN-014", tipo: "Impuestos cobrados", cvu: "0000003100087654321056", email: "pedro.rodriguez@email.com", nombreOrigen: "Pedro Antonio Rodríguez", nombreDestino: "ARBA", cuit: "20-56789012-3", monto: "$ 3.200,00", fecha: "10/01/2025 08:00", estado: "Pendiente" },
];

function ImpuestosPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Impuestos cobrados"
        description="Percepciones e impuestos debitados a los usuarios."
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
