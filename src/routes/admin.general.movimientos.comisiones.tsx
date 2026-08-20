import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { desgloseDemo, fmtARS, type Desglose } from "@/lib/aranceles";

export const Route = createFileRoute("/admin/general/movimientos/comisiones")({
  head: () => ({
    meta: [
      { title: "Cobro de comisiones — Movimientos — Admin Molly" },
      { name: "description", content: "Comisiones cobradas por la plataforma Moli." },
    ],
  }),
  component: ComisionesPage,
});

type Comision = {
  legajo: string;
  usuario: string;
  operacion: string;
  modalidad: string;
  montoOperacion: number;
  porcentajeImpuesto: number;
  idOperacion: string;
  estado: string;
  fecha: string;
};

const data: Comision[] = [
  {
    legajo: "LPF-0021",
    usuario: "carlos.martinez@email.com",
    operacion: "Depósito",
    modalidad: "Porcentaje",
    montoOperacion: 12500,
    porcentajeImpuesto: 21,
    idOperacion: "OP-0003",
    estado: "APROBADO",
    fecha: "14/01/2025 09:15",
  },
  {
    legajo: "LPF-0021",
    usuario: "carlos.martinez@email.com",
    operacion: "Retiro",
    modalidad: "Fijo",
    montoOperacion: 5000,
    porcentajeImpuesto: 21,
    idOperacion: "OP-0012",
    estado: "BLOQUEADO",
    fecha: "11/01/2025 11:20",
  },
  {
    legajo: "LPF-0021",
    usuario: "carlos.martinez@email.com",
    operacion: "Impuesto",
    modalidad: "Porcentaje",
    montoOperacion: 23000,
    porcentajeImpuesto: 21,
    idOperacion: "OP-0032",
    estado: "EN PROGRESO",
    fecha: "10/01/2025 13:45",
  },
  {
    legajo: "LPF-0024",
    usuario: "lucia.mendoza@email.com",
    operacion: "Retiro",
    modalidad: "Fijo",
    montoOperacion: 1500,
    porcentajeImpuesto: 21,
    idOperacion: "OP-0033",
    estado: "RECHAZADO",
    fecha: "09/01/2025 10:10",
  },
];

const desgloseDe = (r: Comision): Desglose => desgloseDemo(r.montoOperacion, r.porcentajeImpuesto);

function ComisionesPage() {
  const [detail, setDetail] = useState<Comision | null>(null);

  const getActions = (row: Comision): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Cobro de comisiones"
        description="Comisiones debitadas a clientes por operaciones, con desglose de Comisión e Impuesto (IVA)."
      />
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.idOperacion}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && (
        <DetailModal
          title="Detalle de comisión"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Legajo", value: <LegajoCell legajo={detail.legajo} /> },
            { label: "Usuario", value: detail.usuario },
            { label: "Operación", value: detail.operacion },
            { label: "Modalidad", value: detail.modalidad },
            {
              label: "Monto de operación",
              value: (
                <span className="font-mono tabular-nums">{fmtARS(detail.montoOperacion)}</span>
              ),
            },
            {
              label: "Comisión",
              value: (
                <span className="font-mono tabular-nums">
                  {fmtARS(desgloseDe(detail).comision)}
                </span>
              ),
            },
            {
              label: `Impuesto (${detail.porcentajeImpuesto}%)`,
              value: (
                <span className="font-mono tabular-nums">
                  {fmtARS(desgloseDe(detail).impuesto)}
                </span>
              ),
            },
            {
              label: "Monto cobrado al cliente",
              value: (
                <span className="font-mono font-semibold tabular-nums">
                  {fmtARS(desgloseDe(detail).total)}
                </span>
              ),
            },
            {
              label: "ID de operación",
              value: <span className="font-mono tabular-nums">{detail.idOperacion}</span>,
            },
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

const columns: Column<Comision>[] = [
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  { key: "operacion", label: "Operación", filterable: true, render: (r) => r.operacion },
  {
    key: "modalidad",
    label: "Modalidad",
    filterable: "enum",
    filterOptions: ["Porcentaje", "Fijo", "Otro"],
    render: (r) => r.modalidad,
  },
  {
    key: "montoOperacion",
    label: "Monto de operación",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(r.montoOperacion)}</span>,
  },
  {
    key: "comision",
    label: "Comisión",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(desgloseDe(r).comision)}</span>,
  },
  {
    key: "impuesto",
    label: "Impuesto (IVA)",
    render: (r) => <span className="font-mono tabular-nums">{fmtARS(desgloseDe(r).impuesto)}</span>,
  },
  {
    key: "total",
    label: "Monto cobrado",
    render: (r) => (
      <span className="font-mono font-semibold tabular-nums">{fmtARS(desgloseDe(r).total)}</span>
    ),
  },
  {
    key: "idOperacion",
    label: "ID de operación",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.idOperacion}</span>,
  },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["APROBADO", "EN PROGRESO", "RECHAZADO", "BLOQUEADO"],
    render: (r) => estadoBadge(r.estado),
  },
  {
    key: "fecha",
    label: "Fecha",
    filterable: "date",
    render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span>,
  },
];
