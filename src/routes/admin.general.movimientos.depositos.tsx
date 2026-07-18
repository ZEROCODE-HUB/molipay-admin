import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — Movimientos — Admin Molly" },
      { name: "description", content: "Depósitos realizados en la plataforma Molly Money Life." },
    ],
  }),
  component: DepositosPage,
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
  { legajo: "MOV-001", id: "TXN-001", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 150.000,00", fecha: "15/01/2025 10:32", estado: "Aprobada" },
  { legajo: "MOV-004", id: "TXN-004", tipo: "Depósito", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Molly Money Life SA", cuit: "27-45678901-2", monto: "$ 320.000,00", fecha: "14/01/2025 14:22", estado: "Aprobada" },
  { legajo: "MOV-010", id: "TXN-010", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 500.000,00", fecha: "12/01/2025 09:00", estado: "Aprobada" },
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

function DepositosPage() {
  return (
    <>
      <PageHeader
        title="Depósitos"
        description="Transacciones de depósito ingresadas a la plataforma."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
