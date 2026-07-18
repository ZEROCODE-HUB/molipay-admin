import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/comisiones")({
  head: () => ({
    meta: [
      { title: "Cobro de comisiones — Movimientos — Admin Molly" },
      { name: "description", content: "Comisiones cobradas por la plataforma Molly Money Life." },
    ],
  }),
  component: ComisionesPage,
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
  { legajo: "MOV-003", id: "TXN-003", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 12.500,00", fecha: "14/01/2025 09:15", estado: "Aprobada" },
  { legajo: "MOV-012", id: "TXN-012", tipo: "Cobro de comisiones", cvu: "0000003100087654321034", email: "carlos.m@email.com", nombreOrigen: "Carlos Alberto Martínez", nombreDestino: "Molly Money Life SA", cuit: "20-34567890-1", monto: "$ 5.000,00", fecha: "11/01/2025 11:20", estado: "Rechazada" },
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

function ComisionesPage() {
  return (
    <>
      <PageHeader
        title="Cobro de comisiones"
        description="Comisiones debitadas a usuarios por operaciones en la plataforma."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
