import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";
import { getClientePorUsuario } from "@/data/clientes";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";

export const Route = createFileRoute("/admin/general/movimientos/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros — Movimientos — Admin Molly" },
      { name: "description", content: "Retiros realizados desde la plataforma Moli." },
    ],
  }),
  component: RetirosPage,
});

const RAW: Omit<Movimiento, "clienteId" | "legajo">[] = [
  {
    id: "TXN-002",
    tipo: "Retiro",
    cvu: "0000003100087654321023",
    usuario: "maria.lopez@email.com",
    nombreOrigen: "María Elena López",
    nombreDestino: "Banco Provincia CC",
    cuit: "27-23456789-0",
    monto: "$ 45.200,00",
    fecha: "15/01/2025 11:05",
    estado: "EN PROGRESO",
  },
  {
    id: "TXN-005",
    tipo: "Retiro",
    cvu: "0000003100087654321056",
    usuario: "pedro.rodriguez@email.com",
    nombreOrigen: "Pedro Antonio Rodríguez",
    nombreDestino: "Banco Nación CA",
    cuit: "20-56789012-3",
    monto: "$ 78.900,00",
    fecha: "14/01/2025 16:48",
    estado: "RECHAZADO",
  },
  {
    id: "TXN-011",
    tipo: "Retiro",
    cvu: "0000003100087654321023",
    usuario: "maria.lopez@email.com",
    nombreOrigen: "María Elena López",
    nombreDestino: "Banco Galicia CC",
    cuit: "27-23456789-0",
    monto: "$ 15.600,00",
    fecha: "11/01/2025 15:30",
    estado: "APROBADO",
  },
  {
    id: "TXN-019",
    tipo: "Retiro",
    cvu: "0000003100087654321077",
    usuario: "jorge.moreno@email.com",
    nombreOrigen: "Jorge Adrián Moreno",
    nombreDestino: "Banco Santander CA",
    cuit: "20-99887766-1",
    monto: "$ 32.800,00",
    fecha: "10/01/2025 08:20",
    estado: "BLOQUEADO",
  },
  {
    id: "TXN-020",
    tipo: "Retiro",
    cvu: "0000003100087654321023",
    usuario: "maria.lopez@email.com",
    nombreOrigen: "María Elena López",
    nombreDestino: "Banco Macro CC",
    cuit: "27-23456789-0",
    monto: "$ 9.950,00",
    fecha: "09/01/2025 14:10",
    estado: "APROBADO",
  },
];

const data: Movimiento[] = RAW.map((m) => {
  const c = getClientePorUsuario(m.usuario);
  return { ...m, legajo: c?.legajo ?? "SIN-LEGAJO", clienteId: c?.id ?? "c-0000" };
});

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
        keyExtractor={(r) => r.id}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

const columns: Column<Movimiento>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "id",
    label: "ID",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.id}</span>,
  },
  {
    key: "cvu",
    label: "CVU/CBU",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cvu}</span>,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreOrigen",
    label: "Nombre completo",
    filterable: true,
    render: (r) => r.nombreOrigen,
  },
  { key: "nombreDestino", label: "Destino", filterable: true, render: (r) => r.nombreDestino },
  {
    key: "cuit",
    label: "CUIT destino",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.cuit}</span>,
  },
  {
    key: "monto",
    label: "Monto",
    render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["APROBADO", "EN PROGRESO", "RECHAZADO", "BLOQUEADO"],
    render: (row) => estadoBadge(row.estado),
  },
];
