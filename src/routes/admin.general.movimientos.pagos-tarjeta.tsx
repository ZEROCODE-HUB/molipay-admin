import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/pagos-tarjeta")({
  head: () => ({
    meta: [
      { title: "Pagos con tarjeta — Movimientos — Admin Molly" },
      { name: "description", content: "Pagos realizados con tarjeta a través de la plataforma Molly Money Life." },
    ],
  }),
  component: PagosTarjetaPage,
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
  { legajo: "MOV-007", id: "TXN-007", tipo: "Pagos con tarjeta", cvu: "0000003100087654321078", email: "gabriel.rios@email.com", nombreOrigen: "Gabriel Esteban Ríos", nombreDestino: "Mercado Pago", cuit: "20-78901234-5", monto: "$ 22.400,00", fecha: "13/01/2025 10:00", estado: "Aprobada" },
  { legajo: "MOV-013", id: "TXN-013", tipo: "Pagos con tarjeta", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Netflix Argentina", cuit: "30-01234567-8", monto: "$ 12.499,00", fecha: "10/01/2025 20:15", estado: "Aprobada" },
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

function PagosTarjetaPage() {
  return (
    <>
      <PageHeader
        title="Pagos con tarjeta"
        description="Transacciones realizadas con tarjeta de crédito o débito."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
