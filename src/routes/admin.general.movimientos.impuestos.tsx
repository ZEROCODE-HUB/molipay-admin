import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";
import { impuestosIniciales } from "@/data/impuestos";

export const Route = createFileRoute("/admin/general/movimientos/impuestos")({
  head: () => ({
    meta: [
      { title: "Impuestos cobrados — Movimientos — Admin Molly" },
      { name: "description", content: "Impuestos cobrados a través de la plataforma Moli." },
    ],
  }),
  component: ImpuestosPage,
});

const impuestos = impuestosIniciales.map((i) => i.nombre);

type ImpuestoCobrado = {
  legajo: string;
  usuario: string;
  nombreCompleto: string;
  idTransaccion: string;
  impuesto: string;
  montoOriginal: string;
  montoImpuesto: string;
  estado: string;
  fechaCobro: string;
};

const data: ImpuestoCobrado[] = [
  {
    legajo: "MOV-006",
    usuario: "lucia.mendoza@email.com",
    nombreCompleto: "Lucía Belén Mendoza",
    idTransaccion: "TXN-006",
    impuesto: "Ingresos Brutos",
    montoOriginal: "$ 8.250,00",
    montoImpuesto: "$ 330,00",
    estado: "APROBADO",
    fechaCobro: "13/01/2025 08:30",
  },
  {
    legajo: "MOV-014",
    usuario: "pedro.rodriguez@email.com",
    nombreCompleto: "Pedro Antonio Rodríguez",
    idTransaccion: "TXN-014",
    impuesto: "Débito/Crédito (Sellos)",
    montoOriginal: "$ 3.200,00",
    montoImpuesto: "$ 19,20",
    estado: "EN PROGRESO",
    fechaCobro: "10/01/2025 08:00",
  },
  {
    legajo: "MOV-034",
    usuario: "pedro.rodriguez@email.com",
    nombreCompleto: "Pedro Antonio Rodríguez",
    idTransaccion: "TXN-034",
    impuesto: "Percepción Ganancias",
    montoOriginal: "$ 1.100,00",
    montoImpuesto: "$ 143,00",
    estado: "RECHAZADO",
    fechaCobro: "09/01/2025 09:05",
  },
  {
    legajo: "MOV-035",
    usuario: "lucia.mendoza@email.com",
    nombreCompleto: "Lucía Belén Mendoza",
    idTransaccion: "TXN-035",
    impuesto: "IVA Digital",
    montoOriginal: "$ 1.800,00",
    montoImpuesto: "$ 378,00",
    estado: "BLOQUEADO",
    fechaCobro: "08/01/2025 14:40",
  },
];

function ImpuestosPage() {
  const [detail, setDetail] = useState<ImpuestoCobrado | null>(null);

  const getActions = (row: ImpuestoCobrado): ActionItem[] => [
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
      {detail && (
        <DetailModal
          title="Detalle de impuesto cobrado"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Legajo", value: <span className="font-mono tabular-nums">{detail.legajo}</span> },
            { label: "Usuario", value: detail.usuario },
            { label: "Nombre completo", value: detail.nombreCompleto },
            { label: "ID de transacción", value: <span className="font-mono tabular-nums">{detail.idTransaccion}</span> },
            { label: "Impuesto", value: detail.impuesto },
            { label: "Monto original", value: <span className="font-mono tabular-nums">{detail.montoOriginal}</span> },
            { label: "Monto impuesto", value: <span className="font-mono tabular-nums">{detail.montoImpuesto}</span> },
            { label: "Estado", value: estadoBadge(detail.estado) },
            { label: "Fecha de cobro", value: <span className="font-mono tabular-nums">{detail.fechaCobro}</span> },
          ]}
        />
      )}
    </>
  );
}

const columns: Column<ImpuestoCobrado>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span> },
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "nombreCompleto",
    label: "Nombre completo",
    filterable: true,
    render: (r) => r.nombreCompleto,
  },
  {
    key: "idTransaccion",
    label: "ID de transacción",
    filterable: true,
    render: (r) => <span className="font-mono tabular-nums">{r.idTransaccion}</span>,
  },
  {
    key: "impuesto",
    label: "Impuesto",
    filterable: "enum",
    filterOptions: impuestos,
    render: (r) => r.impuesto,
  },
  { key: "montoOriginal", label: "Monto original", render: (r) => <span className="font-mono tabular-nums">{r.montoOriginal}</span> },
  { key: "montoImpuesto", label: "Monto impuesto", render: (r) => <span className="font-mono tabular-nums">{r.montoImpuesto}</span> },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: ["APROBADO", "EN PROGRESO", "RECHAZADO", "BLOQUEADO"],
    render: (r) => estadoBadge(r.estado),
  },
  { key: "fechaCobro", label: "Fecha de cobro", filterable: "date", render: (r) => <span className="font-mono tabular-nums">{r.fechaCobro}</span> },
];
