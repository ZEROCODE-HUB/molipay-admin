import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";

import type { AnalysisReconciliationModalVm } from "./use-analysis-reconciliation-modal";

export function ReconciliationSummary({
  summary,
  movCount,
  rangeLabel,
  archivo,
}: Pick<AnalysisReconciliationModalVm, "movCount" | "rangeLabel" | "archivo"> & {
  summary: NonNullable<AnalysisReconciliationModalVm["summary"]>;
}) {
  return (
    <Card className="p-4">
      <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        No encontrados — detalle paginado (10 por página) · cruce ID_DEBIN → id_txn (+ fallback
        monto+fecha)
      </h4>
      {(() => {
        const noFounds = summary.items.filter((it) => it.estado === "no_encontrado");
        if (noFounds.length === 0)
          return (
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Sin IDs — todo conciliado
            </span>
          );
        type RowNE = {
          id: string;
          tipo: string;
          importe: number;
          fecha: string;
          cvu: string;
        };
        const rows: RowNE[] = noFounds.map((it) => ({
          id: it.bankRow.idDebin,
          tipo: it.bankRow.tipoMovCoelsa,
          importe: it.bankRow.importeCoelsa,
          fecha: it.bankRow.fechaHoraCoelsa || it.bankRow.fechaNegocio,
          cvu: it.bankRow.cvu,
        }));
        const cols: import("@/shared/ui/data-table").Column<RowNE>[] = [
          {
            key: "id",
            label: "ID_DEBIN",
            filterable: true,
            render: (r) => <span className="font-mono text-[11px]">{r.id}</span>,
          },
          {
            key: "tipo",
            label: "Tipo",
            filterable: "enum",
            filterOptions: ["CREDITO", "DEBITO"],
            render: (r) => r.tipo,
          },
          {
            key: "importe",
            label: "Importe",
            sortable: true,
            render: (r) => (
              <span className="font-mono tabular-nums">
                {r.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            ),
          },
          {
            key: "fecha",
            label: "Fecha",
            sortable: true,
            render: (r) => <span className="font-mono text-xs">{r.fecha}</span>,
          },
          {
            key: "cvu",
            label: "CVU",
            filterable: true,
            render: (r) => <span className="font-mono text-[11px]">{r.cvu || "—"}</span>,
          },
        ];
        return <DataTable columns={cols} data={rows} keyExtractor={(r) => r.id} pageSize={10} />;
      })()}
      {summary.idsDiferenciaMonto.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
            Diferencias de monto ({summary.idsDiferenciaMonto.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {summary.idsDiferenciaMonto.map((id) => (
              <span
                key={id}
                className="inline-flex rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[11px] text-red-700"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        Movimientos consultados en plataforma: {movCount} · Rango {rangeLabel || archivo.fecha} · Si
        ves 0, la tabla <code>movimientos</code> no tiene filas para ese rango o RLS lo bloquea;
        entonces 0 conciliados es esperado.
      </p>
    </Card>
  );
}
