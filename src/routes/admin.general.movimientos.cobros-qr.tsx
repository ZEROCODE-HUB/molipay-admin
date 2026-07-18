import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/general/movimientos/cobros-qr")({
  head: () => ({
    meta: [
      { title: "Cobros QR — Movimientos — Admin Molly" },
      { name: "description", content: "Cobros realizados mediante código QR en la plataforma Molly Money Life." },
    ],
  }),
  component: CobrosQrPage,
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
  { legajo: "MOV-009", id: "TXN-009", tipo: "Cobros QR", cvu: "0000003100087654321090", email: "diego.fernandez@email.com", nombreOrigen: "Diego Martín Fernández", nombreDestino: "Kiosco 24hs", cuit: "27-90123456-7", monto: "$ 1.200,00", fecha: "12/01/2025 18:45", estado: "Pendiente" },
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

function CobrosQrPage() {
  return (
    <>
      <PageHeader
        title="Cobros QR"
        description="Cobros generados por el comercio mediante código QR para que el usuario escanee."
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
