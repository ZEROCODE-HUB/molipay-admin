import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";
import { getClientePorUsuario } from "@/data/clientes";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";

export const Route = createFileRoute("/admin/general/movimientos/pagos-tarjeta")({
  head: () => ({
    meta: [
      { title: "Pagos con tarjeta — Movimientos — Admin Molly" },
      {
        name: "description",
        content: "Pagos realizados con tarjeta a través de la plataforma Moli.",
      },
    ],
  }),
  component: PagosTarjetaPage,
});

const estados = ["CREADO", "ABIERTO", "EN PROGRESO", "APROBADO", "EXPIRADO", "RECHAZADO"];

type PagoTarjeta = {
  legajo: string;
  usuario: string;
  monto: string;
  medioPago: string;
  cuotas: string;
  estado: string;
  fecha: string;
};

const RAW: Omit<PagoTarjeta, "legajo">[] = [
  {
    usuario: "gabriel.rios@email.com",
    monto: "$ 22.400,00",
    medioPago: "Visa",
    cuotas: "3",
    estado: "APROBADO",
    fecha: "13/01/2025 10:00",
  },
  {
    usuario: "ana.garcia@email.com",
    monto: "$ 12.499,00",
    medioPago: "Mastercard",
    cuotas: "1",
    estado: "EN PROGRESO",
    fecha: "10/01/2025 20:15",
  },
  {
    usuario: "lucas.rivas@email.com",
    monto: "$ 8.900,00",
    medioPago: "Visa",
    cuotas: "0",
    estado: "CREADO",
    fecha: "10/01/2025 11:30",
  },
  {
    usuario: "sofia.moreno@email.com",
    monto: "$ 31.250,00",
    medioPago: "American Express",
    cuotas: "6",
    estado: "ABIERTO",
    fecha: "09/01/2025 16:45",
  },
  {
    usuario: "marcos.peralta@email.com",
    monto: "$ 5.600,00",
    medioPago: "Mastercard",
    cuotas: "1",
    estado: "EXPIRADO",
    fecha: "08/01/2025 19:00",
  },
  {
    usuario: "clara.molina@email.com",
    monto: "$ 14.300,00",
    medioPago: "Visa",
    cuotas: "3",
    estado: "RECHAZADO",
    fecha: "07/01/2025 13:10",
  },
];

const data: PagoTarjeta[] = RAW.map((m) => ({
  ...m,
  legajo: getClientePorUsuario(m.usuario)?.legajo ?? "SIN-LEGAJO",
}));

function PagosTarjetaPage() {
  const [detail, setDetail] = useState<PagoTarjeta | null>(null);

  const getActions = (row: PagoTarjeta): ActionItem[] => [
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
      {detail && (
        <DetailModal
          title="Detalle de pago con tarjeta"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Legajo", value: <LegajoCell legajo={detail.legajo} /> },
            { label: "Usuario", value: detail.usuario },
            {
              label: "Monto",
              value: <span className="font-mono tabular-nums">{detail.monto}</span>,
            },
            { label: "Medio de pago", value: detail.medioPago },
            { label: "Cuotas", value: detail.cuotas },
            { label: "Estado", value: estadoBadge(detail.estado) },
            {
              label: "Fecha",
              value: <span className="font-mono tabular-nums">{detail.fecha}</span>,
            },
          ]}
        />
      )}
    </>
  );
}

const columns: Column<PagoTarjeta>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "monto",
    label: "Monto",
    render: (r) => <span className="font-mono tabular-nums">{r.monto}</span>,
  },
  { key: "medioPago", label: "Medio de pago", filterable: true, render: (r) => r.medioPago },
  { key: "cuotas", label: "Cuotas", filterable: true, render: (r) => r.cuotas },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: estados,
    render: (r) => estadoBadge(r.estado),
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
];
