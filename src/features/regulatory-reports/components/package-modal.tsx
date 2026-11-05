import { BCRA_FILE_LABEL,type BcraFiling } from "@/features/regulatory-reports/bcra.supabase";
import { useState } from "react";
import {
AlertTriangle,
Download,
FileArchive,
FileSpreadsheet,
FileText,
Loader2,
} from "lucide-react";
import { NAME_EN_PACKAGE,namePackage } from "@/features/regulatory-reports/bcra/files";
import { formatDateTime } from "@/shared/lib/format";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Modal,ModalHeader,StatusBadge } from "./bcra-reports-parts";
import { labelPeriod } from "@/features/regulatory-reports/bcra-reports.rules";

/* ---------- Confirmación del paquete ---------- */

export function PackageModal({
  periodo: period,
  cuit,
  presentaciones: filings,
  onClose,
  onConfirm,
}: {
  periodo: string;
  cuit: string;
  presentaciones: BcraFiling[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [bajando, setBajando] = useState(false);
  const withNotices = filings.filter((p) => p.avisos.length > 0);
  const withoutPresentar = filings.filter((p) => p.estado !== "presentado").length;

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <ModalHeader
        icon={<FileArchive size={18} />}
        title={`Paquete BCRA · ${labelPeriod(period)}`}
        subtitle={namePackage(cuit, period)}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Se van a incluir estos {filings.length} archivos (la última versión de cada uno):
        </p>
        <ul className="rounded-xl border border-border divide-y divide-border">
          {filings.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  {p.archivo === "I" ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold font-mono truncate">
                    {NAME_EN_PACKAGE[p.archivo]}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {BCRA_FILE_LABEL[p.archivo]} · {p.cantidadFilas} fila(s) · generado{" "}
                    {formatDateTime(p.generadoAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.avisos.length > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700"
                    title={p.avisos.join("\n")}
                  >
                    <AlertTriangle size={12} /> {p.avisos.length}
                  </span>
                )}
                <StatusBadge p={p} />
              </div>
            </li>
          ))}
        </ul>

        {withNotices.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle size={13} /> Revisá los avisos antes de presentar
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {withNotices.flatMap((p) =>
                p.avisos.map((a, i) => (
                  <li key={`${p.id}${i}`}>{`${BCRA_FILE_LABEL[p.archivo]}: ${a}`}</li>
                )),
              )}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {withoutPresentar > 0
            ? `${withoutPresentar} archivo(s) todavía no están marcados como presentados. Después de subir el paquete a SISCEN, marcalos desde el menú ⋯.`
            : "Todos los archivos ya figuran como presentados."}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
        <BtnOutline onClick={onClose} disabled={bajando}>
          Cancelar
        </BtnOutline>
        <BtnPrimary
          disabled={bajando}
          onClick={async () => {
            setBajando(true);
            await onConfirm();
            setBajando(false);
          }}
        >
          {bajando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{" "}
          Descargar ZIP ({filings.length} archivos)
        </BtnPrimary>
      </div>
    </Modal>
  );
}
