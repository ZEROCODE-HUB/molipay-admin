import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";
import { getClientePorUsuario } from "@/data/clientes";
import { LegajoCell, LEGAJO_TOOLTIP } from "@/components/legajo-label";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/admin/general/movimientos/cobros-qr")({
  head: () => ({
    meta: [
      { title: "Cobros QR — Movimientos — Admin Molly" },
      {
        name: "description",
        content: "Cobros realizados mediante código QR en la plataforma Moli.",
      },
    ],
  }),
  component: CobrosQrPage,
});

const tiposQr = ["Estático", "Dinámico", "Modo abierto"];
const estadosQr = ["Activo", "Usado", "Expirado", "Cancelado"];
const estados = ["EN PROGRESO", "APROBADO", "RECHAZADO", "REEMBOLSADO"];

type CobroQr = {
  usuario: string;
  legajo: string;
  tipoQr: string;
  estadoQr: string;
  montoTotal: string;
  comision: string;
  montoNeto: string;
  estado: string;
  fecha: string;
};

const RAW: Omit<CobroQr, "legajo">[] = [
  {
    usuario: "diego.fernandez@email.com",
    tipoQr: "Estático",
    estadoQr: "Usado",
    montoTotal: "$ 1.200,00",
    comision: "$ 36,00",
    montoNeto: "$ 1.164,00",
    estado: "APROBADO",
    fecha: "12/01/2025 18:45",
  },
  {
    usuario: "valentina.castro@email.com",
    tipoQr: "Dinámico",
    estadoQr: "Activo",
    montoTotal: "$ 4.500,00",
    comision: "$ 135,00",
    montoNeto: "$ 4.365,00",
    estado: "EN PROGRESO",
    fecha: "12/01/2025 20:10",
  },
  {
    usuario: "nicolas.aguirre@email.com",
    tipoQr: "Dinámico",
    estadoQr: "Usado",
    montoTotal: "$ 6.300,00",
    comision: "$ 189,00",
    montoNeto: "$ 6.111,00",
    estado: "RECHAZADO",
    fecha: "11/01/2025 15:20",
  },
  {
    usuario: "martina.diaz@email.com",
    tipoQr: "Estático",
    estadoQr: "Expirado",
    montoTotal: "$ 980,00",
    comision: "$ 29,40",
    montoNeto: "$ 950,60",
    estado: "REEMBOLSADO",
    fecha: "10/01/2025 11:35",
  },
];

const initialData: CobroQr[] = RAW.map((m) => ({
  ...m,
  legajo: getClientePorUsuario(m.usuario)?.legajo ?? "SIN-LEGAJO",
}));

function CobrosQrPage() {
  const [data, setData] = useState<CobroQr[]>(initialData);
  const [detail, setDetail] = useState<CobroQr | null>(null);
  const [reembolsar, setReembolsar] = useState<CobroQr | null>(null);

  const getActions = (row: CobroQr): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
    {
      label: "Reembolsar",
      icon: RotateCcw,
      onClick: () => setReembolsar(row),
    },
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
      {detail && (
        <DetailModal
          title="Detalle de cobro QR"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Usuario", value: detail.usuario },
            { label: "Legajo", value: <LegajoCell legajo={detail.legajo} /> },
            { label: "Tipo QR", value: detail.tipoQr },
            { label: "Estado QR", value: estadoBadge(detail.estadoQr) },
            {
              label: "Monto total",
              value: <span className="font-mono tabular-nums">{detail.montoTotal}</span>,
            },
            {
              label: "Comisión",
              value: <span className="font-mono tabular-nums">{detail.comision}</span>,
            },
            {
              label: "Monto neto",
              value: <span className="font-mono tabular-nums">{detail.montoNeto}</span>,
            },
            { label: "Estado", value: estadoBadge(detail.estado) },
            {
              label: "Fecha",
              value: <span className="font-mono tabular-nums">{detail.fecha}</span>,
            },
          ]}
        />
      )}
      {reembolsar && (
        <ConfirmDialog
          open={!!reembolsar}
          onClose={() => setReembolsar(null)}
          title="Reembolsar cobro"
          message={`¿Estás seguro de reembolsar el cobro ${reembolsar.legajo}? El estado pasará a REEMBOLSADO.`}
          confirmLabel="Reembolsar"
          onConfirm={() =>
            setData((prev) =>
              prev.map((c) =>
                c.legajo === reembolsar.legajo ? { ...c, estado: "REEMBOLSADO" } : c,
              ),
            )
          }
        />
      )}
    </>
  );
}

const columns: Column<CobroQr>[] = [
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  {
    key: "legajo",
    label: "Legajo",
    hint: LEGAJO_TOOLTIP,
    filterable: true,
    render: (r) => <LegajoCell legajo={r.legajo} />,
  },
  {
    key: "tipoQr",
    label: "Tipo QR",
    filterable: "enum",
    filterOptions: tiposQr,
    render: (r) => r.tipoQr,
  },
  {
    key: "estadoQr",
    label: "Estado QR",
    filterable: "enum",
    filterOptions: estadosQr,
    render: (r) => estadoBadge(r.estadoQr),
  },
  {
    key: "montoTotal",
    label: "Monto Total",
    render: (r) => <span className="font-mono tabular-nums">{r.montoTotal}</span>,
  },
  {
    key: "comision",
    label: "Comisión",
    render: (r) => <span className="font-mono tabular-nums">{r.comision}</span>,
  },
  {
    key: "montoNeto",
    label: "Monto Neto",
    render: (r) => <span className="font-mono tabular-nums">{r.montoNeto}</span>,
  },
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
