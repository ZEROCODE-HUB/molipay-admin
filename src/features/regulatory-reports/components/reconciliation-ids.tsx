import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { downloadText } from "@/shared/lib/download";
import { Download } from "lucide-react";

import type { AnalysisReconciliationModalVm } from "./use-analysis-reconciliation-modal";

export function ReconciliationIds({
  summary,
  dateAnalysis,
  archivo,
}: Pick<AnalysisReconciliationModalVm, "dateAnalysis" | "archivo"> & {
  summary: NonNullable<AnalysisReconciliationModalVm["summary"]>;
}) {
  return (
    <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-4">
      <Card className="p-4">
        <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          IDs resumidos
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Depósitos (CREDITO)
            </div>
            {summary.idsDepositosNoEncontrados.length === 0 ? (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Sin IDs
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {summary.idsDepositosNoEncontrados.slice(0, 20).map((id) => (
                  <span
                    key={id}
                    className="inline-flex rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {id}
                  </span>
                ))}
                {summary.idsDepositosNoEncontrados.length > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{summary.idsDepositosNoEncontrados.length - 20} más (ver tabla)
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Retiros (DEBITO)
            </div>
            {summary.idsRetirosNoEncontrados.length === 0 ? (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Sin IDs
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {summary.idsRetirosNoEncontrados.slice(0, 20).map((id) => (
                  <span
                    key={id}
                    className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    {id}
                  </span>
                ))}
                {summary.idsRetirosNoEncontrados.length > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{summary.idsRetirosNoEncontrados.length - 20} más
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 flex flex-col justify-between">
        <div>
          <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Análisis
          </h4>
          <p className="font-mono text-xs font-medium tabular-nums">{dateAnalysis}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {summary.encontrados} de {summary.total} conciliados — mapeo ID_DEBIN= id_txn,
            |IMPORTE_COELSA|= monto_operacion
          </p>
        </div>
        <BtnOutline
          className="mt-3 h-7 text-xs px-2.5 w-full justify-center"
          onClick={() => {
            const rows = summary.items.map((it) => ({
              ID_DEBIN: it.bankRow.idDebin,
              TIPO: it.bankRow.tipoMovCoelsa,
              IMPORTE_BANCO: it.bankRow.importeCoelsa,
              ESTADO_BANCO: it.bankRow.estadoCoelsa,
              id_txn_plataforma: it.movimiento?.idTxn ?? "",
              monto_plataforma: it.movimiento?.montoOperacion ?? "",
              estado_cruce: it.estado,
              detalle: it.detalle,
            }));
            const cols = Object.keys(rows[0] ?? {});
            const esc = (v: unknown) => {
              const s = v == null ? "" : String(v);
              return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const csv = [
              cols.join(","),
              ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")),
            ].join("\n");
            downloadText(`cruce_${archivo.archivo.replace(/\.[^.]+$/, "")}.csv`, csv);
          }}
        >
          <Download size={14} /> Descargar cruce CSV
        </BtnOutline>
      </Card>
    </div>
  );
}
