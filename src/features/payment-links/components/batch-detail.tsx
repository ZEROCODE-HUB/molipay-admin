import { BatchInfoSection } from "./batch-info-section";
import { BatchFinancialSection } from "./batch-financial-section";
import { BatchMovementsSection } from "./batch-movements-section";
import { BatchSimulationActions } from "./batch-simulation-actions";
import { useBatchDetail } from "./use-batch-detail";
import { Modal } from "@/shared/ui/modal";
import { type BatchCredit } from "@/infrastructure/supabase/legacy/types";
import { CheckCircle2, Download, Gavel, Receipt } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { parseDateLocal } from "@/features/payment-links/batches.rules";

export function BatchDetail(props: {
  lote: BatchCredit;
  onClose: () => void;
  onSubirCsv: (l: BatchCredit) => void;
  onAcreditar?: (l: BatchCredit) => void;
}) {
  const vm = useBatchDetail(props);
  const { onClose, onCredit, batch, esInstallments, exportBatch } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Receipt size={18} /> Detalle del lote
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              {batch.codigo} · {parseDateLocal(batch.fecha).toLocaleDateString("es-AR")} ·{" "}
              {batch.comercio?.nombreComercio ?? batch.comercio?.usuario ?? batch.comercioId} ·{" "}
              {batch.bandera} {esInstallments ? `· ${batch.cuotas} cuotas` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportBatch}
              className="p-1.5 hover:bg-muted rounded-md"
              title="Exportar a Excel"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <BatchInfoSection {...vm} />

          <BatchFinancialSection {...vm} />

          <BatchMovementsSection {...vm} />

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <BatchSimulationActions {...vm} />
            {batch.estado === "Pendiente" && onCredit && (
              <button
                onClick={() => onCredit(batch)}
                disabled={!batch.elegible}
                title={
                  batch.elegible
                    ? undefined
                    : (batch.motivoNoElegible ?? "No se puede acreditar todavía")
                }
                className="h-9 px-4 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} className="inline mr-1.5" /> Acreditar
              </button>
            )}
            {batch.contracargos > 0 && (
              <Link
                to="/admin/comercios/link-pago/contracargos"
                className="h-9 px-4 rounded-md text-sm font-semibold bg-card border text-foreground hover:bg-muted inline-flex items-center"
              >
                <Gavel size={14} className="inline mr-1.5" /> Ver contracargo
              </Link>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
