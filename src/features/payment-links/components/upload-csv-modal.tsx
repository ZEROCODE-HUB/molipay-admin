import { ErrorNotice } from "@/shared/ui/error-notice";
import { useUploadCsvModal } from "@/features/payment-links/components/use-upload-csv-modal";
import { FormDialog } from "@/shared/ui/form-dialog";
import { formatIsoDate, formatMoney } from "@/shared/lib/format";
import { Label } from "@/shared/ui/form-controls";
import { FileDropzone } from "@/shared/ui/file-dropzone";
import { EJEMPLO_FILE } from "@/features/payment-links/settlements-parse";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { CsvPreviewPanel } from "@/features/payment-links/components/csv-preview-panel";
import { type Props } from "@/features/payment-links/upload-csv-modal.types";

export function LoadCsvModal(props: Props) {
  const vm = useUploadCsvModal(props);
  const {
    open,
    batch,
    setFile,
    parseado,
    parseError,
    parsing,
    verColumns,
    setVerColumns,
    saving,
    errorGuardado,
    downloadCsvChargebackDemo,
    close,
    apply,
    t,
  } = vm;

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={batch ? `Subir CSV de Payway - ${batch.codigo}` : "Subir CSV de Payway"}
      description="Archivo diario de liquidación de Payway. Cada renglón con importe crea un lote de acreditación Pendiente; lo que no se puede asignar a un comercio va a Excepciones."
      onSubmit={() => void apply()}
      submitLabel={
        t
          ? `Confirmar importación (${t.con_importe - t.excepciones} lote(s))`
          : "Confirmar importación"
      }
      size="xl"
      isSubmitting={saving}
      cancelLabel="Cancelar"
    >
      <div className="space-y-5">
        {batch && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <div className="text-muted-foreground">Comercio</div>
                <div className="font-semibold truncate">
                  {batch.comercio?.nombreComercio ?? batch.comercio?.usuario ?? batch.comercioId}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Bandera</div>
                <div className="font-semibold">{batch.bandera}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bruto estimado</div>
                <div className="font-mono font-semibold">
                  {formatMoney(batch.importeBruto ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha estimada</div>
                <div className="font-mono font-semibold">{formatIsoDate(batch.fecha)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 1: archivo */}
        <div>
          <Label>Adquirente de origen</Label>
          <select
            className="mt-1 w-full sm:w-64 h-9 rounded-md border bg-background px-2 text-sm"
            defaultValue="payway"
          >
            <option value="payway">Payway / Decidir</option>
            <option value="qr" disabled>
              Proveedor QR (no habilitado)
            </option>
          </select>
        </div>
        <div>
          <Label>Archivo de liquidación de Payway</Label>
          <div className="mt-1.5">
            <FileDropzone onFile={setFile} accept=".csv,.txt,text/csv,text/plain" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <details className="flex-1">
              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                Ver formato esperado
              </summary>
              <pre className="mt-1.5 p-2.5 rounded-md bg-muted/50 text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
                {EJEMPLO_FILE}
              </pre>
              <p className="text-[11px] text-muted-foreground mt-1">
                Delimitador punto y coma. Las columnas se buscan por nombre, así que el orden no
                importa. Bruto + costo + impuestos tiene que dar el neto. Las líneas antes del
                encabezado se ignoran, así que el título del periodo no molesta.
              </p>
            </details>
            <button
              type="button"
              onClick={downloadCsvChargebackDemo}
              className="h-8 px-3 rounded-md border bg-card text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted shrink-0"
              title="Descarga un CSV con 5 contracargos simulados para probar el importador"
            >
              <Download size={12} /> CSV de prueba (contracargos)
            </button>
          </div>
        </div>

        {parseError && (
          <ErrorNotice>
            <span>{parseError}</span>
          </ErrorNotice>
        )}

        {parsing && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            Leyendo y validando el archivo...
          </p>
        )}

        {/* Lectura del archivo (mapeo de columnas) */}
        {parseado && (
          <div className="rounded-lg border p-3 space-y-2">
            <button
              type="button"
              onClick={() => setVerColumns((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {verColumns ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Lectura del archivo
            </button>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Encabezado en la línea{" "}
                <span className="font-mono text-foreground">{parseado.lineaEncabezado}</span>
              </span>
              <span>
                <span className="font-mono text-foreground">{parseado.renglones.length}</span>{" "}
                renglones
              </span>
              {parseado.sinMovimiento > 0 && (
                <span>
                  <span className="font-mono text-foreground">{parseado.sinMovimiento}</span> sin
                  movimiento (importes en 0)
                </span>
              )}
            </div>
            {parseado.encabezadoLineas.map((l, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">
                <span className="font-mono text-foreground">Línea {i + 1} (ignorada):</span> {l}
              </p>
            ))}
            {verColumns && (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Se usa como</th>
                    <th className="py-1 font-medium text-right">Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {parseado.mapeo.map((c) => (
                    <tr key={c.archivo} className="border-t">
                      <td className="py-1 font-mono">{c.archivo}</td>
                      <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                        {c.indice === null ? "-" : c.indice + 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Vista previa (la arma la base) */}
        <CsvPreviewPanel {...vm} />

        {errorGuardado && (
          <ErrorNotice>
            <span>{errorGuardado}</span>
          </ErrorNotice>
        )}
      </div>
    </FormDialog>
  );
}
