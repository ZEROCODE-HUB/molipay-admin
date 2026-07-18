import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Badge } from "@/components/portal-shell";

export const Route = createFileRoute("/admin/modulos/impuestos")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Impuestos — Admin — Molly Money Life" },
      { name: "description", content: "Gestión de impuestos retenidos y propios de la plataforma." },
    ],
  }),
});

type TaxRecord = {
  id: number;
  tipo: string;
  periodo: string;
  monto: string;
  transferencia: string;
  estado: string;
};

const taxData: TaxRecord[] = [
  { id: 1, tipo: "Débito/crédito", periodo: "Junio 2026", monto: "$ 12,450.00", transferencia: "15/07/2026", estado: "Transferido" },
  { id: 2, tipo: "Ingresos Brutos", periodo: "Junio 2026", monto: "$ 8,230.50", transferencia: "10/07/2026", estado: "Transferido" },
  { id: 3, tipo: "Débito/crédito", periodo: "Mayo 2026", monto: "$ 11,980.00", transferencia: "15/06/2026", estado: "Transferido" },
  { id: 4, tipo: "Ingresos Brutos", periodo: "Mayo 2026", monto: "$ 7,890.00", transferencia: "10/06/2026", estado: "Transferido" },
  { id: 5, tipo: "Débito/crédito", periodo: "Abril 2026", monto: "$ 10,320.00", transferencia: "15/05/2026", estado: "Pendiente" },
  { id: 6, tipo: "Ingresos Brutos", periodo: "Abril 2026", monto: "$ 6,540.00", transferencia: "10/05/2026", estado: "Pendiente" },
  { id: 7, tipo: "Débito/crédito", periodo: "Marzo 2026", monto: "$ 9,870.00", transferencia: "15/04/2026", estado: "Transferido" },
  { id: 8, tipo: "Ingresos Brutos", periodo: "Marzo 2026", monto: "$ 5,210.00", transferencia: "10/04/2026", estado: "Transferido" },
  { id: 9, tipo: "Débito/crédito", periodo: "Febrero 2026", monto: "$ 8,450.00", transferencia: "15/03/2026", estado: "Transferido" },
  { id: 10, tipo: "Ingresos Brutos", periodo: "Febrero 2026", monto: "$ 4,780.00", transferencia: "10/03/2026", estado: "Transferido" },
  { id: 11, tipo: "Débito/crédito", periodo: "Enero 2026", monto: "$ 7,320.00", transferencia: "15/02/2026", estado: "Transferido" },
  { id: 12, tipo: "Ingresos Brutos", periodo: "Enero 2026", monto: "$ 3,990.00", transferencia: "10/02/2026", estado: "Transferido" },
];

function Page() {
  const columns: Column<TaxRecord>[] = [
    { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs">#{r.id}</span> },
    { key: "tipo", label: "Tipo", sortable: true, filterable: true, render: (r) => r.tipo },
    { key: "periodo", label: "Periodo", sortable: true, render: (r) => r.periodo },
    { key: "monto", label: "Monto retenido", sortable: true, render: (r) => <span className="font-semibold">{r.monto}</span> },
    { key: "transferencia", label: "Fecha transferencia", sortable: true, render: (r) => r.transferencia },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (r) => (
        <Badge tone={r.estado === "Transferido" ? "success" : "warn"}>{r.estado}</Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Impuestos"
        description="Gestión de impuestos retenidos y propios de la plataforma."
      />
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3 items-start">
        <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-300 leading-relaxed">
          MoliPay maneja dos tipos de impuestos, totalmente separados. (1) Impuestos propios de
          Molly: Ganancias (anual) e Ingresos Brutos sobre su comisión — es ganancia del negocio,
          gestionada por su contabilidad, no afecta al cliente. (2) Impuestos retenidos al cliente:
          Molly es agente de retención, no pagador. Se retienen dos impuestos por operación —
          Débito/crédito (0,6% en ingresos, 0,6% en egresos, transferido mensualmente) e Ingresos
          Brutos del cliente (porcentaje variable según base del organismo fiscal, transferido cada
          10 días). Ese dinero nunca es ganancia de Molly: se retiene transitoriamente y se
          transfiere al organismo.
        </p>
      </div>
      <DataTable columns={columns} data={taxData} keyExtractor={(r) => r.id} pageSize={10} />
    </>
  );
}
