import { DataTable,type Column } from "@/shared/ui/data-table";
import { downloadXlsx } from "@/shared/lib/download";
import { Download } from "lucide-react";
import { type AfipParams,type AfipRow } from "@/features/regulatory-reports/reports.types";
import { afipData } from "@/features/regulatory-reports/reports.rules";

export function AfipTable({ params }: { params: AfipParams }) {
  const rowReport = (r: AfipRow) => ({
    concepto: "Reporte AFIP",
    periodo: r.fecha,
    monto_transaccion_mes: params.montoTransaccion,
    monto_saldo_fin_mes: params.montoSaldo,
  });

  const columns: Column<AfipRow>[] = [
    {
      key: "b8125",
      label: "B8125",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadXlsx(r.b8125, [rowReport(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "b8126",
      label: "B8126",
      sortable: true,
      filterable: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => downloadXlsx(r.b8126, [rowReport(r)])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Download size={14} /> XLS
        </button>
      ),
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      filterable: "date",
      render: (r) => <span className="font-mono text-xs tabular-nums">{r.fecha}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={afipData}
      keyExtractor={(r) => r.fecha}
      pageSize={10}
      showDownloadButton={false}
    />
  );
}
