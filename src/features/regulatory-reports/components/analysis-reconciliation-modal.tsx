import { ReconciliationSummary } from "./reconciliation-summary";
import { ReconciliationIds } from "./reconciliation-ids";
import { useAnalysisReconciliationModal } from "./use-analysis-reconciliation-modal";
import { Modal } from "@/shared/ui/modal";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { type Archivo } from "@/features/regulatory-reports/reports.types";

export function AnalysisReconciliationModal(props: {
  archivo: Archivo;
  allArchivos: Archivo[];
  onClose: () => void;
}) {
  const vm = useAnalysisReconciliationModal(props);
  const { archivo, onClose, summary, loading, error, rangeLabel, porcentaje, Kpi } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3.5 flex justify-between items-start z-10">
          <div>
            <h3 className="font-display text-[15px] font-semibold leading-none">
              Análisis de conciliación
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {archivo.archivo} · {archivo.fecha} {rangeLabel ? `· ${rangeLabel}` : ""}
            </p>
            {rangeLabel && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Rango plataforma: {rangeLabel} — 1er reporte histórico, siguientes delta desde
                último.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">
              Analizando… cruzando ID_DEBIN ↔ id_txn y montos…
            </p>
          )}
          {error && <p className="text-sm text-red-600">Error: {error}</p>}
          {summary && !loading && !error && (
            <>
              {/* Resumen + éxito */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Resumen general
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {porcentaje}% éxito · {summary.encontrados}/{summary.total}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <Kpi label="Total" value={summary.total} />
                  <Kpi label="Encontrados" value={summary.encontrados} accent />
                  <Kpi label="No encontrados" value={summary.noEncontrados} />
                  <Kpi label="No completados" value={summary.noCompletados} />
                  <Kpi label="Dif. monto" value={summary.diferenciasMonto} />
                  <Kpi label="Éxito" value={`${porcentaje}%`} accent />
                </div>
                {summary.soloPlataforma > 0 && (
                  <p className="text-[11px] text-amber-600 mt-2">
                    + {summary.soloPlataforma} movimientos solo en plataforma (no están en banco)
                  </p>
                )}
              </Card>

              <Card className="p-4">
                <h4 className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Distribución por tipo (TIPO_MOV_COELSA: CREDITO=Depósito / DEBITO=Retiro)
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Kpi label="Depósitos · total" value={summary.depositos.total} />
                  <Kpi label="Depósitos · encontrados" value={summary.depositos.encontrados} />
                  <Kpi label="Retiros · total" value={summary.retiros.total} />
                  <Kpi label="Retiros · encontrados" value={summary.retiros.encontrados} />
                </div>
              </Card>

              <ReconciliationSummary {...vm} summary={summary} />
              <ReconciliationIds {...vm} summary={summary} />
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex justify-end">
          <BtnOutline onClick={onClose} className="h-8 text-xs px-4">
            Cerrar
          </BtnOutline>
        </div>
      </div>
    </Modal>
  );
}
