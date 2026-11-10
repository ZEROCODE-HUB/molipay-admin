import { establishmentDeBatch } from "@/features/payment-links/credits.supabase";
import { AlertTriangle, FileUp } from "lucide-react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { formatMoney } from "@/shared/lib/format";
import { downloadText } from "@/shared/lib/download";
import { generateCsvSettlementTestForBatch } from "@/features/payment-links/settlements-parse";
import { generateChargebackReportForBatch } from "@/features/payment-links/importers/chargeback-real-csv";

import type { BatchDetailVm } from "./use-batch-detail";

export function BatchSimulationActions({
  batch,
  movs,
  onSubirCsv,
}: Pick<BatchDetailVm, "batch" | "movs" | "onSubirCsv">) {
  // Archivo diario de liquidacion: el total del lote en una fila, como Payway.
  // La importacion identifica al comercio por el numero de establecimiento de
  // Payway: el de la tabla de establecimientos para la marca del lote o, si no
  // hay, el site_id de la ficha del comercio.
  const downloadSettlement = async () => {
    let siteId: string | undefined;
    try {
      const est = await establishmentDeBatch(batch.id);
      siteId = est.establecimiento?.trim() || undefined;
    } catch (e) {
      toast.error(`No se pudo leer el establecimiento: ${userMessage(e)}`);
    }
    const { filename, contenido: content } = generateCsvSettlementTestForBatch(
      {
        codigo: batch.codigo,
        fecha: batch.fecha,
        bandera: batch.bandera,
        importeBruto: batch.importeBruto,
        // Porcentaje PayWay (3 = 3%), NO el monto. El helper deriva
        // COSTO_DE_SERVICIO del CSV como -(bruto x pct / 100), igual que la UI.
        tasaPaywayPct: Number(batch.tasaPaywayPct) || 0,
        impuestos: batch.impuestos,
        costoPaywayPagoUnico: batch.costoPaywayPagoUnico,
        comercio: { siteId: siteId ?? null },
      },
      movs.map((m) => ({ fecha: m.fecha, montoOperacion: Number(m.montoOperacion) || 0 })),
    );
    downloadText(filename, content, "text/csv;charset=utf-8");
    toast.success(`CSV de prueba generado: ${filename}`);
    if (!siteId) {
      toast.warning(
        `El comercio no tiene establecimiento de Payway para ${batch.bandera}. El archivo se generó con un placeholder (00000000): al importarlo va a quedar en Excepciones y desde ahí lo podés asignar.`,
        { duration: 8000 },
      );
    }
  };

  // Reporte de Contracargos de Payway (otro archivo): una venta real del lote,
  // al azar. Se sube en Contracargos > Importar y se retiene en este lote.
  const downloadChargeback = async () => {
    try {
      const r = await generateChargebackReportForBatch(
        { codigo: batch.codigo, bandera: batch.bandera },
        movs.map((m) => m.id),
      );
      downloadText(r.filename, r.csv, "text/csv;charset=utf-8");
      toast.success(
        `Contracargo de prueba por la venta ${r.siteTransactionId} (${formatMoney(r.monto)}). Subilo en Contracargos → Importar.`,
        { duration: 8000 },
      );
    } catch (e) {
      toast.error(userMessage(e, "No se pudo generar el contracargo de prueba"));
    }
  };

  const open = batch.estado === "Programado" || batch.estado === "Pendiente";

  return (
    <>
      {batch.estado === "Programado" && (
        <button
          onClick={() => void downloadSettlement()}
          className="h-9 px-4 rounded-md text-sm font-semibold bg-card border text-foreground hover:bg-muted"
          title="Genera un archivo de Payway coherente con este lote, para probar el flujo Programado → Pendiente sin esperar al archivo real"
        >
          <FileUp size={14} className="inline mr-1.5" /> Descargar CSV de prueba
        </button>
      )}
      {open && movs.length > 0 && (
        <button
          onClick={() => void downloadChargeback()}
          className="h-9 px-4 rounded-md text-sm font-semibold bg-card border border-red-200 text-red-700 hover:bg-red-50"
          title="Reporte de Contracargos de Payway con una venta real de este lote, elegida al azar. Se sube en Contracargos → Importar."
        >
          <AlertTriangle size={14} className="inline mr-1.5" /> Descargar contracargo de prueba
        </button>
      )}
      {batch.estado === "Programado" && (
        <button
          onClick={() => onSubirCsv(batch)}
          className="h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
        >
          <FileUp size={14} className="inline mr-1.5" /> Subir CSV
        </button>
      )}
    </>
  );
}
