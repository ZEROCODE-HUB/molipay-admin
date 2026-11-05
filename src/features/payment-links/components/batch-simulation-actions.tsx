import { establishmentDeBatch } from "@/features/payment-links/credits.supabase";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { generateCsvSettlementTestForBatch } from "@/features/payment-links/settlements-parse";

import type { BatchDetailVm } from "./use-batch-detail";

export function BatchSimulationActions({
  batch,
  movs,
  onSubirCsv,
}: Pick<BatchDetailVm, "batch" | "movs" | "onSubirCsv">) {
  return (
    <>
      {batch.estado === "Programado" && (
        <>
          <button
            onClick={async () => {
              // El número de establecimiento que Payway usa en su
              // archivo NO vive en `comercio_establecimientos` (ese
              // mapa es para resolver comercio desde el CSV), sino
              // en `comercios.site_id`: el identificador del sitio
              // que el banco le asignó al comercio. Lo leemos del
              // embed que ya viene en el lote.
              //
              // El archivo se arma a partir de los movimientos
              // reales del lote: una fila por movimiento, con la
              // fecha y el monto individuales. Si no hay
              // movimientos cargados todavía, se cae a una sola
              // fila agregada con el total del lote. Nunca se
              // incluyen otros lotes u otras banderas.
              // La importacion identifica al comercio por el numero de
              // establecimiento de Payway: el de la tabla de
              // establecimientos para la marca del lote o, si no hay,
              // el site_id de la ficha del comercio.
              let siteId: string | undefined;
              try {
                const est = await establishmentDeBatch(batch.id);
                siteId = est.establecimiento?.trim() || undefined;
              } catch (e) {
                toast.error(`No se pudo leer el establecimiento: ${userMessage(e)}`);
              }
              let notice: string | null = null;
              if (!siteId) {
                notice = `El comercio no tiene establecimiento de Payway para ${batch.bandera}. El archivo se generó con un placeholder (00000000): al importarlo va a quedar en Excepciones y desde ahí lo podés asignar.`;
              }
              const { filename, contenido: content } = generateCsvSettlementTestForBatch(
                {
                  codigo: batch.codigo,
                  fecha: batch.fecha,
                  bandera: batch.bandera,
                  importeBruto: batch.importeBruto,
                  // Porcentaje PayWay (3 = 3%), NO el monto. El
                  // helper deriva COSTO_DE_SERVICIO del CSV
                  // como -(bruto × pct / 100), igual que la UI.
                  tasaPaywayPct: Number(batch.tasaPaywayPct) || 0,
                  impuestos: batch.impuestos,
                  costoPaywayPagoUnico: batch.costoPaywayPagoUnico,
                  comercio: { siteId: siteId ?? null },
                },
                movs.map((m) => ({
                  fecha: m.fecha,
                  montoOperacion: Number(m.montoOperacion) || 0,
                })),
              );
              const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              const cantRows = Math.max(1, movs.length);
              toast.success(
                `CSV de prueba generado: ${filename} (${cantRows} fila${cantRows === 1 ? "" : "s"})`,
              );
              if (notice) toast.warning(notice, { duration: 8000 });
            }}
            className="h-9 px-4 rounded-md text-sm font-semibold bg-card border text-foreground hover:bg-muted"
            title="Genera un archivo de Payway coherente con este lote, para probar el flujo Programado → Pendiente sin esperar al archivo real"
          >
            <FileUp size={14} className="inline mr-1.5" /> Descargar CSV de prueba
          </button>
          <button
            onClick={() => onSubirCsv(batch)}
            className="h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
          >
            <FileUp size={14} className="inline mr-1.5" /> Subir CSV
          </button>
        </>
      )}
    </>
  );
}
