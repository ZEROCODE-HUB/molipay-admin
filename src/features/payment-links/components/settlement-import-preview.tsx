import { AlertTriangle,Download,FileUp,Loader2,ArrowLeft } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnPrimary,BtnOutline } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Amount,date } from "@/features/payment-links/components/credits-common";
import { StatusImportacion,Dato } from "@/features/payment-links/components/settlements-parts";
import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementImportPreview({
  step,
  preview,
  t,
  file,
  range,
  columns,
  rows,
  filterResult,
  setFilterResult,
  showCeros,
  setShowCeros,
  downloadErrors,
  revisado,
  setRevisado,
  setStep,
  reiniciar,
  confirm,
  confirmando,
  puede,
}: Pick<
  SettlementsPageVm,
  | "step"
  | "preview"
  | "t"
  | "file"
  | "range"
  | "columns"
  | "rows"
  | "filterResult"
  | "setFilterResult"
  | "showCeros"
  | "setShowCeros"
  | "downloadErrors"
  | "revisado"
  | "setRevisado"
  | "setStep"
  | "reiniciar"
  | "confirm"
  | "confirmando"
  | "puede"
>) {
  return (
    <>
      {(step === 2 || step === 3) && preview && t && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-semibold">{file?.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · Desde {date(range.desde ?? t.desde)} hasta {date(range.hasta ?? t.hasta)}
                </span>
              </div>
              <StatusImportacion estado={preview.estado} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              <Dato label="Renglones" v={t.renglones} />
              <Dato label="Con importe" v={t.con_importe} />
              <Dato label="En cero" v={t.en_cero} />
              <Dato
                label="Excepciones"
                v={t.excepciones}
                tone={t.excepciones > 0 ? "warn" : undefined}
              />
              <Dato label="Errores" v={t.errores} tone={t.errores > 0 ? "danger" : undefined} />
              <Dato label="Bruto" v={<Amount v={t.bruto} />} />
              <Dato label="Costo + impuestos" v={<Amount v={t.costo + t.impuestos} />} />
              <Dato label="Neto" v={<Amount v={t.neto} strong />} />
            </div>
            {preview.por_fecha_marca.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                  Neto por fecha y bandera (debe coincidir con lo que entró a la recaudadora)
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.por_fecha_marca.map((x) => (
                    <span
                      key={`${x.fecha}-${x.marca}`}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      {date(x.fecha)} · {x.marca}: <Amount v={x.neto} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {preview.archivo_duplicado && (
              <p className="flex items-center gap-1.5 text-sm text-red-700">
                <AlertTriangle size={14} /> Este archivo ya fue importado. No se puede volver a
                importar.
              </p>
            )}
          </Card>

          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.nro}
            pageSize={20}
            showDownloadButton={false}
            showGlobalFilter={false}
            extraFilters={
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value as typeof filterResult)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Todos los resultados</option>
                  <option value="importa">Se importa</option>
                  <option value="excepcion">Excepción</option>
                  <option value="error">Error</option>
                  <option value="ignora">Se ignora</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={showCeros}
                    onChange={(e) => setShowCeros(e.target.checked)}
                  />
                  Mostrar renglones en cero
                </label>
                <BtnOutline
                  className="h-9 text-xs px-3"
                  onClick={downloadErrors}
                  disabled={t.errores + t.excepciones === 0}
                >
                  <Download size={14} /> Descargar errores
                </BtnOutline>
              </div>
            }
          />

          <Card className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={revisado}
                onChange={(e) => {
                  setRevisado(e.target.checked);
                  setStep(e.target.checked ? 3 : 2);
                }}
                disabled={!preview.puede_confirmar}
              />
              <span>
                Revisé la vista previa y los totales coinciden con la liquidación de Payway.
                {!preview.puede_confirmar && (
                  <span className="block text-xs text-red-700 mt-0.5">
                    {preview.archivo_duplicado
                      ? "El archivo ya fue importado."
                      : t.errores > 0
                        ? "Corregí los errores del archivo antes de importarlo."
                        : "El archivo no tiene renglones con importe."}
                  </span>
                )}
              </span>
            </label>
            <div className="flex justify-between gap-2">
              <BtnOutline onClick={reiniciar}>
                <ArrowLeft size={16} /> Volver
              </BtnOutline>
              <div className="flex gap-2">
                <BtnOutline onClick={reiniciar}>Cancelar</BtnOutline>
                <BtnPrimary
                  onClick={() => void confirm()}
                  disabled={!revisado || !preview.puede_confirmar || confirmando || !puede}
                >
                  {confirmando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileUp size={16} />
                  )}{" "}
                  Confirmar importación
                </BtnPrimary>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
