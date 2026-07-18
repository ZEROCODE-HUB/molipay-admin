import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/")({
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Historial completo de movimientos de la plataforma." },
    ],
  }),
  component: TodosPage,
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

const allTransactions: Movimiento[] = [
  { legajo: "MOV-001", id: "TXN-001", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 150.000,00", fecha: "15/01/2025 10:32", estado: "Aprobada" },
  { legajo: "MOV-002", id: "TXN-002", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Provincia CC", cuit: "27-23456789-0", monto: "$ 45.200,00", fecha: "15/01/2025 11:05", estado: "Pendiente" },
  { legajo: "MOV-003", id: "TXN-003", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 12.500,00", fecha: "14/01/2025 09:15", estado: "Aprobada" },
  { legajo: "MOV-004", id: "TXN-004", tipo: "Depósito", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Molly Money Life SA", cuit: "27-45678901-2", monto: "$ 320.000,00", fecha: "14/01/2025 14:22", estado: "Aprobada" },
  { legajo: "MOV-005", id: "TXN-005", tipo: "Retiro", cvu: "0000003100087654321056", email: "pedro.rodriguez@email.com", nombreOrigen: "Pedro Antonio Rodríguez", nombreDestino: "Banco Nación CA", cuit: "20-56789012-3", monto: "$ 78.900,00", fecha: "14/01/2025 16:48", estado: "Rechazada" },
  { legajo: "MOV-006", id: "TXN-006", tipo: "Impuestos cobrados", cvu: "0000003100087654321067", email: "lucia.mendoza@email.com", nombreOrigen: "Lucía Belén Mendoza", nombreDestino: "AFIP", cuit: "27-67890123-4", monto: "$ 8.250,00", fecha: "13/01/2025 08:30", estado: "Aprobada" },
  { legajo: "MOV-007", id: "TXN-007", tipo: "Pagos con tarjeta", cvu: "0000003100087654321078", email: "gabriel.rios@email.com", nombreOrigen: "Gabriel Esteban Ríos", nombreDestino: "Mercado Pago", cuit: "20-78901234-5", monto: "$ 22.400,00", fecha: "13/01/2025 10:00", estado: "Aprobada" },
  { legajo: "MOV-008", id: "TXN-008", tipo: "Pagos QR", cvu: "0000003100087654321089", email: "valentina.castro@email.com", nombreOrigen: "Valentina Castro", nombreDestino: "Supermercado El Colono", cuit: "30-89012345-6", monto: "$ 3.750,00", fecha: "13/01/2025 12:15", estado: "Aprobada" },
  { legajo: "MOV-009", id: "TXN-009", tipo: "Cobros QR", cvu: "0000003100087654321090", email: "diego.fernandez@email.com", nombreOrigen: "Diego Martín Fernández", nombreDestino: "Kiosco 24hs", cuit: "27-90123456-7", monto: "$ 1.200,00", fecha: "12/01/2025 18:45", estado: "Pendiente" },
  { legajo: "MOV-010", id: "TXN-010", tipo: "Depósito", cvu: "0000003100087654321012", email: "juan.perez@email.com", nombreOrigen: "Juan Carlos Pérez", nombreDestino: "Molly Money Life SA", cuit: "20-12345678-9", monto: "$ 500.000,00", fecha: "12/01/2025 09:00", estado: "Aprobada" },
  { legajo: "MOV-011", id: "TXN-011", tipo: "Retiro", cvu: "0000003100087654321023", email: "maria.lopez@email.com", nombreOrigen: "María Elena López", nombreDestino: "Banco Galicia CC", cuit: "27-23456789-0", monto: "$ 15.600,00", fecha: "11/01/2025 15:30", estado: "Aprobada" },
  { legajo: "MOV-012", id: "TXN-012", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 5.000,00", fecha: "11/01/2025 11:20", estado: "Rechazada" },
  { legajo: "MOV-013", id: "TXN-013", tipo: "Pagos con tarjeta", cvu: "0000003100087654321045", email: "ana.garcia@email.com", nombreOrigen: "Ana Sofía García", nombreDestino: "Netflix Argentina", cuit: "30-01234567-8", monto: "$ 12.499,00", fecha: "10/01/2025 20:15", estado: "Aprobada" },
  { legajo: "MOV-014", id: "TXN-014", tipo: "Impuestos cobrados", cvu: "0000003100087654321056", email: "pedro.rodriguez@email.com", nombreOrigen: "Pedro Antonio Rodríguez", nombreDestino: "ARBA", cuit: "20-56789012-3", monto: "$ 3.200,00", fecha: "10/01/2025 08:00", estado: "Pendiente" },
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

function TodosPage() {
  return (
    <>
      <PageHeader
        title="Todos los movimientos"
        description="Historial completo de transacciones de la plataforma."
      />
      <DataTable columns={columns} data={allTransactions} />
    </>
  );
}
