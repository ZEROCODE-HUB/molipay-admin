import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { DetailModal, estadoBadge } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/pagos-qr")({
  head: () => ({
    meta: [
      { title: "Pagos QR — Movimientos — Admin Molly" },
      {
        name: "description",
        content: "Pagos realizados mediante código QR en la plataforma Moli.",
      },
    ],
  }),
  component: PagosQrPage,
});

const estados = ["Pendiente", "Completado", "Fallido", "Reembolsado"];

type PagoQr = {
  usuario: string;
  legajo: string;
  qrIdTx: string;
  monto: string;
  cuitMerchant: string;
  estado: string;
  fecha: string;
};

const data: PagoQr[] = [
  {
    usuario: "valentina.castro@email.com",
    legajo: "MOV-008",
    qrIdTx: "QR-TX-008",
    monto: "$ 3.750,00",
    cuitMerchant: "30-89012345-6",
    estado: "Completado",
    fecha: "13/01/2025 12:15",
  },
];

function PagosQrPage() {
  const [detail, setDetail] = useState<PagoQr | null>(null);

  const getActions = (row: PagoQr): ActionItem[] => [
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
      {detail && (
        <DetailModal
          title="Detalle de pago QR"
          onClose={() => setDetail(null)}
          rows={[
            { label: "Usuario", value: detail.usuario },
            { label: "Legajo", value: <span className="font-mono tabular-nums">{detail.legajo}</span> },
            { label: "QR ID TX", value: <span className="font-mono tabular-nums">{detail.qrIdTx}</span> },
            { label: "Monto", value: <span className="font-mono tabular-nums">{detail.monto}</span> },
            { label: "CUIT Merchant", value: <span className="font-mono tabular-nums">{detail.cuitMerchant}</span> },
            { label: "Estado", value: estadoBadge(detail.estado) },
            { label: "Fecha", value: <span className="font-mono tabular-nums">{detail.fecha}</span> },
          ]}
        />
      )}
    </>
  );
}

const columns: Column<PagoQr>[] = [
  { key: "usuario", label: "Usuario", filterable: true, render: (r) => r.usuario },
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.legajo}</span> },
  { key: "qrIdTx", label: "QR ID TX", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.qrIdTx}</span> },
  { key: "monto", label: "Monto", render: (r) => <span className="font-mono tabular-nums">{r.monto}</span> },
  { key: "cuitMerchant", label: "CUIT Merchant", filterable: true, render: (r) => <span className="font-mono tabular-nums">{r.cuitMerchant}</span> },
  {
    key: "estado",
    label: "Estado",
    filterable: "enum",
    filterOptions: estados,
    render: (r) => estadoBadge(r.estado),
  },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => <span className="font-mono tabular-nums">{r.fecha}</span> },
];
