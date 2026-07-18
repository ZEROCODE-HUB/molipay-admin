import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/pagos-qr")({
  head: () => ({
    meta: [
      { title: "Pagos QR — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos realizados mediante código QR en la plataforma Molly Money Life." },
    ],
  }),
  component: PagosQrPage,
});

type Movimiento = {
  legajo: string;
  id: string;
  tipo: string;
  cvu: string;
  email: string;
  nombreOrigen: string;
  nombreDestino: string;
  cuit: string;
  monto: string;
  fecha: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
};

const lifecycleTooltip =
  "Una transacción nace Pendiente: el saldo se descuenta para el cliente, pero el dinero aún no salió realmente. La plataforma espera confirmación de la cuenta recaudadora del banco. Si confirma, se genera el ID COELSA —prueba definitiva de salida— y pasa a Aprobada. Si no, pasa a Rechazada y el saldo se revierte.";

const data: Movimiento[] = [
  { legajo: "MOV-008", id: "TXN-008", tipo: "Pagos QR", cvu: "0000003100087654321089", email: "valentina.castro@email.com", nombreOrigen: "Valentina Castro", nombreDestino: "Supermercado El Colono", cuit: "30-89012345-6", monto: "$ 3.750,00", fecha: "13/01/2025 12:15", estado: "Aprobada" },
];

const estadoBadge = (e: Movimiento["estado"]) => {
  const map: Record<string, { label: string; tone: "success" | "warn" | "danger" }> = {
    Aprobada: { label: "Aprobada", tone: "success" },
    Pendiente: { label: "Pendiente", tone: "warn" },
    Rechazada: { label: "Rechazada", tone: "danger" },
  };
  const m = map[e];
  return (
    <span title={lifecycleTooltip} className="cursor-help">
      <Badge tone={m.tone}>{m.label}</Badge>
    </span>
  );
};

const columns: Column<Movimiento>[] = [
  { key: "legajo", header: "Legajo" },
  { key: "id", header: "ID" },
  { key: "tipo", header: "Tipo de transacción" },
  { key: "cvu", header: "CVU" },
  { key: "email", header: "Email" },
  { key: "nombreOrigen", header: "Nombre empresa/persona" },
  { key: "nombreDestino", header: "Nombre destino" },
  { key: "cuit", header: "CUIT" },
  { key: "monto", header: "Monto" },
  { key: "fecha", header: "Fecha" },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => estadoBadge(row.estado),
  },
];

function PagosQrPage() {
  return (
    <>
      <PageHeader
        title="Pagos QR"
        description="Pagos iniciados por el usuario mediante escaneo de código QR."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
