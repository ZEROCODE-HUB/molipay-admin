import { ErrorNotice } from "@/shared/ui/error-notice";
import { Badge } from "@/shared/ui/badge";
import { formatMoney, formatIsoDate } from "@/shared/lib/format";
import { RESULT } from "@/features/payment-links/upload-csv-modal.rules";
import type { UploadCsvModalVm } from "./use-upload-csv-modal";

export function CsvPreviewPanel({
  preview,
  t,
  showCeros,
  setShowCeros,
  rows,
  revisado,
  setRevisado,
}: Pick<
  UploadCsvModalVm,
  "preview" | "t" | "showCeros" | "setShowCeros" | "rows" | "revisado" | "setRevisado"
>) {
  return (
    <>
      {preview && t && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground">Con importe</div>
              <div className="font-mono font-semibold">{t.con_importe}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground">Excepciones</div>
              <div
                className={`font-mono font-semibold ${t.excepciones > 0 ? "text-amber-700" : ""}`}
              >
                {t.excepciones}
              </div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground">Errores</div>
              <div className={`font-mono font-semibold ${t.errores > 0 ? "text-red-600" : ""}`}>
                {t.errores}
              </div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-muted-foreground">Neto del archivo</div>
              <div className="font-mono font-semibold">{formatMoney(t.neto ?? 0)}</div>
            </div>
          </div>

          {preview.archivo_duplicado && (
            <ErrorNotice>Este archivo ya fue importado. No se puede volver a importar.</ErrorNotice>
          )}

          {preview.por_fecha_marca.length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              Neto por fecha y bandera (debe coincidir con lo que entró a la recaudadora):{" "}
              {preview.por_fecha_marca.map((x) => (
                <span key={`${x.fecha}-${x.marca}`} className="mr-2 font-mono text-foreground">
                  {formatIsoDate(x.fecha)} {x.marca} {formatMoney(x.neto ?? 0)}
                </span>
              ))}
            </div>
          )}

          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showCeros}
              onChange={(e) => setShowCeros(e.target.checked)}
            />
            Mostrar renglones en cero
          </label>

          <div className="overflow-x-auto max-h-80 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="px-2.5 py-2 font-medium">Fila</th>
                  <th className="px-2.5 py-2 font-medium">Fecha</th>
                  <th className="px-2.5 py-2 font-medium">Marca</th>
                  <th className="px-2.5 py-2 font-medium">Establecimiento</th>
                  <th className="px-2.5 py-2 font-medium">Comercio</th>
                  <th className="px-2.5 py-2 font-medium text-right">Bruto CSV</th>
                  <th className="px-2.5 py-2 font-medium text-right">Neto CSV</th>
                  <th className="px-2.5 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.nro}>
                    <td className="px-2.5 py-1.5 font-mono">{r.nro}</td>
                    <td className="px-2.5 py-1.5 font-mono">{formatIsoDate(r.fecha)}</td>
                    <td className="px-2.5 py-1.5">{r.marca ?? "-"}</td>
                    <td className="px-2.5 py-1.5 font-mono">{r.establecimiento ?? "-"}</td>
                    <td className="px-2.5 py-1.5">
                      {r.comercio ? (
                        `${r.comercio} · ${r.legajo}`
                      ) : (
                        <span className="text-muted-foreground">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono">
                      {formatMoney(r.bruto ?? 0)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono">
                      {formatMoney(r.neto ?? 0)}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <Badge tone={RESULT[r.resultado].tone}>{RESULT[r.resultado].texto}</Badge>
                      {r.motivo && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.motivo}</div>
                      )}
                      {r.advertencias.includes("posible_duplicado") && (
                        <div className="text-[10px] text-amber-700">Posible duplicado</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={revisado}
              onChange={(e) => setRevisado(e.target.checked)}
              disabled={!preview.puede_confirmar}
            />
            <span>
              Revisé la vista previa y los totales coinciden con la liquidación de Payway.
            </span>
          </label>
        </div>
      )}
    </>
  );
}
