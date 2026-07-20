import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { ActionsDropdown, type ActionItem } from "@/components/actions-dropdown";
import { MovimientoDetail, estadoBadge, type Movimiento } from "@/components/movimiento-detail";

export const Route = createFileRoute("/admin/general/movimientos/")({
  head: () => ({
    meta: [
      { title: "Todos los movimientos — Movimientos — Admin Molly" },
      { name: "description", content: "Historial completo de movimientos de la plataforma." },
    ],
  }),
  component: TodosPage,
});

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

function TodosPage() {
  const [detail, setDetail] = useState<Movimiento | null>(null);

  const getActions = (row: Movimiento): ActionItem[] => [
    { label: "Ver detalles", icon: Eye, onClick: () => setDetail(row) },
  ];

  return (
    <>
      <PageHeader
        title="Todos los movimientos"
        description="Historial completo de transacciones de la plataforma."
      />
      <DataTable
        columns={columns}
        data={allTransactions}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
      />
      {detail && <MovimientoDetail m={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

const columns: Column<Movimiento>[] = [
  { key: "legajo", label: "Legajo", filterable: true, render: (r) => r.legajo },
  { key: "id", label: "ID", filterable: true, render: (r) => r.id },
  { key: "tipo", label: "Tipo de transacción", filterable: true, render: (r) => r.tipo },
  { key: "cvu", label: "CVU", filterable: true, render: (r) => r.cvu },
  { key: "email", label: "Email", filterable: true, render: (r) => r.email },
  { key: "nombreOrigen", label: "Nombre empresa/persona", filterable: true, render: (r) => r.nombreOrigen },
  { key: "nombreDestino", label: "Nombre destino", filterable: true, render: (r) => r.nombreDestino },
  { key: "cuit", label: "CUIT", filterable: true, render: (r) => r.cuit },
  { key: "monto", label: "Monto", render: (r) => r.monto },
  { key: "fecha", label: "Fecha", filterable: "date", render: (r) => r.fecha },
  {
    key: "estado",
    label: "Estado", filterable: "enum", filterOptions: ["Aprobada", "Pendiente", "Rechazada"],
    render: (row) => estadoBadge(row.estado),
  },
];
