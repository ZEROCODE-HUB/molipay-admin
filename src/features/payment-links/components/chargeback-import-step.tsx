import { ErrorNotice } from "@/shared/ui/error-notice";
import { Upload,X,FileSpreadsheet,Loader2 } from "lucide-react";
import { BtnPrimary,BtnOutline } from "@/shared/ui/button";
import { phaseLabel } from "@/features/payment-links/import-chargebacks-modal.rules";
import { Preview } from "@/features/payment-links/components/preview";
import { Results } from "@/features/payment-links/components/import-chargebacks-modal-results";
import type { ImportChargebacksModalVm } from "./use-import-chargebacks-modal";

export function ChargebackImportStep({
  onClose,
  phase,
  onDrop,
  inputRef,
  onSelect,
  parseError,
  onDownloadDemo,
  downloadingDemo,
  errorDemo,
  parsed,
  results,
  summary,
  setParsed,
  setFile,
  setPhase,
  onImport,
}: Pick<
  ImportChargebacksModalVm,
  | "onClose"
  | "phase"
  | "onDrop"
  | "inputRef"
  | "onSelect"
  | "parseError"
  | "onDownloadDemo"
  | "downloadingDemo"
  | "errorDemo"
  | "parsed"
  | "results"
  | "summary"
  | "setParsed"
  | "setFile"
  | "setPhase"
  | "onImport"
>) {
  return (
    <div className="min-h-0 flex-1 flex flex-col">
      <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Upload size={18} /> Importar reporte de PayWay
          </h3>
          <p className="text-sm text-muted-foreground">
            Alertas Tempranas de Contracargos (.csv / .xlsx, máx 10MB).
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-md"
          disabled={phase === "importing"}
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {phase === "idle" && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30 transition"
            >
              <FileSpreadsheet size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Arrastrá el archivo acá o hacé click para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">CSV o XLSX — hasta 10MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
              />
              {parseError && <ErrorNotice className="mt-4">{parseError}</ErrorNotice>}
            </div>
            <button
              type="button"
              onClick={onDownloadDemo}
              disabled={downloadingDemo}
              className="w-full h-9 rounded-md border bg-card text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted disabled:opacity-50"
              title="Genera un CSV con los últimos 5 TIDs reales de la DB para probar el importador end-to-end"
            >
              {downloadingDemo ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={12} />
              )}
              {downloadingDemo
                ? "Generando CSV con TIDs reales..."
                : "Descargar CSV de prueba con TIDs reales de la base"}
            </button>
            {errorDemo && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                {errorDemo}
              </div>
            )}
          </>
        )}

        {(phase === "parsing" || phase === "importing") && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
            {phaseLabel(phase)}
          </div>
        )}

        {phase === "preview" && parsed && <Preview parsed={parsed} />}

        {phase === "done" && results && summary && <Results summary={summary} results={results} />}
      </div>

      <div className="border-t px-6 py-4 flex justify-end gap-2">
        {phase === "preview" && (
          <>
            <BtnOutline
              onClick={() => {
                setParsed(null);
                setFile(null);
                setPhase("idle");
              }}
            >
              Cambiar archivo
            </BtnOutline>
            <BtnPrimary onClick={onImport} disabled={(parsed?.rows.length ?? 0) === 0}>
              Importar {parsed?.rows.length} fila(s)
            </BtnPrimary>
          </>
        )}
        {phase === "done" && <BtnPrimary onClick={onClose}>Cerrar</BtnPrimary>}
        {phase === "idle" && <BtnOutline onClick={onClose}>Cancelar</BtnOutline>}
      </div>
    </div>
  );
}
