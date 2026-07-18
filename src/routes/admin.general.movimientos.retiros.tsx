import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros — Movimientos — Admin Molly" },
      { name: "description", content: "Retiros realizados desde la plataforma Molly Money Life." },
    ],
  }),
  component: RetirosPage,
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
  { legajo: "MOV-002", id: "TXN-002", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Provincia CC", cuit: "27-23456789-0", monto: "$ 45.200,00", fecha: "15/01/2025 11:05", estado: "Pendiente" },
  { legajo: "MOV-005", id: "TXN-005", tipo: "Retiro", cvu: "0000003100087654321056", email: "pedro.rodriguez@email.com", nombreOrigen: "Pedro Antonio Rodríguez", nombreDestino: "Banco Nación CA", cuit: "20-56789012-3", monto: "$ 78.900,00", fecha: "14/01/2025 16:48", estado: "Rechazada" },
  { legajo: "MOV-011", id: "TXN-011", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Galicia CC", cuit: "27-23456789-0", monto: "$ 15.600,00", fecha: "11/01/2025 15:30", estado: "Aprobada" },
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

function RetirosPage() {
  return (
    <>
      <PageHeader
        title="Retiros"
        description="Transacciones de retiro desde la plataforma hacia cuentas externas."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
