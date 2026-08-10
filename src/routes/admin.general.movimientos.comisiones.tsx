import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";

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
  tipo: string;
  montoComision: string;
  montoOperacion: string;
  idOperacion: string;
  estado: string;
  fecha: string;
};

const data: Comision[] = [
  {
    legajo: "MOV-003",
    usuario: "carlos.m@email.com",
    operacion: "Depósito",
    tipo: "Porcentaje",
    montoComision: "$ 1.875,00",
    montoOperacion: "$ 12.500,00",
    idOperacion: "OP-0003",
    estado: "APROBADO",
    fecha: "14/01/2025 09:15",
  },
  {
    legajo: "MOV-012",
    usuario: "carlos.m@email.com",
    operacion: "Retiro",
    tipo: "Fijo",
    montoComision: "$ 250,00",
    montoOperacion: "$ 5.000,00",
    idOperacion: "OP-0012",
    estado: "BLOQUEADO",
    fecha: "11/01/2025 11:20",
  },
  {
    legajo: "MOV-032",
    usuario: "carlos.m@email.com",
    operacion: "Impuesto",
    tipo: "Porcentaje",
    montoComision: "$ 460,00",
    montoOperacion: "$ 23.000,00",
    idOperacion: "OP-0032",
    estado: "EN PROGRESO",
    fecha: "10/01/2025 13:45",
  },
  {
    legajo: "MOV-033",
    usuario: "lucia.mendoza@email.com",
    operacion: "Retiro",
    tipo: "Fijo",
    montoComision: "$ 75,00",
    montoOperacion: "$ 1.500,00",
    idOperacion: "OP-0033",
    estado: "RECHAZADO",
    fecha: "09/01/2025 10:10",
  },
];

function ComisionesPage() {
  const [detail, setDetail] = useState<Comision | null>(null);

  const getActions = (row: Comision): ActionItem[] => [
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
      {detail && (
        <DetailModal
          title="Detalle de comisión"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Legajo", value: <span className="font-mono tabular-nums">{detail.legajo}</span> },
            { label: "Usuario", value: detail.usuario },
            { label: "Operación", value: detail.operacion },
            { label: "Tipo", value: detail.tipo },
            { label: "Monto de comisión", value: <span className="font-mono tabular-nums">{detail.montoComision}</span> },
            { label: "Monto de operación", value: <span className="font-mono tabular-nums">{detail.montoOperacion}</span> },
            { label: "ID de operación", value: <span className="font-mono tabular-nums">{detail.idOperacion}</span> },
            { label: "Estado", value: estadoBadge(detail.estado) },
            { label: "Fecha", value: <span className="font-mono tabular-nums">{detail.fecha}</span> },
          ]}
        />
      )}
    </>
  );
}

const columns: Column<Comision>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span> },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  { key: "operacion", label: "Operación", filterable: true, render: (r) => r.operacion },
  {
    key: "tipo",
    label: "Tipo",
    filterable: "enum",
    filterOptions: ["Porcentaje", "Fijo", "Otro"],
    render: (r) => r.tipo,
  },
  { key: "montoComision", label: "Monto de comisión", render: (r) => <span className="font-mono tabular-nums">{r.montoComision}</span> },
  { key: "montoOperacion", label: "Monto de operación", render: (r) => <span className="font-mono tabular-nums">{r.montoOperacion}</span> },
  { key: "idOperacion", label: "ID de operación", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.idOperacion}</span> },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["APROBADO", "EN PROGRESO", "RECHAZADO", "BLOQUEADO"],
    render: (r) => estadoBadge(r.estado),
  },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span> },
];
