import { Modal } from "@/shared/ui/modal";
import { useState } from "react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { toast } from "sonner";
import { type BlpFile } from "@/features/regulatory-reports/reports.types";

export function BlpAnalysisModal({
  archivo: file,
  onClose,
}: {
  archivo: BlpFile;
  onClose: () => void;
}) {
  const [ejecutado, setEjecutado] = useState(false);
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-md">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">Analizar conciliación</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="text-foreground font-medium">Archivo:</span>{" "}
              <span className="font-mono">{file.archivo}</span>
            </div>
            <div>
              <span className="text-foreground font-medium">Fecha:</span>{" "}
              <span className="font-mono">{file.fecha}</span>
            </div>
            <div>
              <span className="text-foreground font-medium">Estado:</span> {file.estado}
            </div>
          </div>
          <p className="text-sm">
            Se ejecutará el análisis de la conciliación BLP correspondiente.
          </p>
          {ejecutado && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-sm px-3 py-2">
              Análisis ejecutado correctamente.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <BtnOutline className="h-9 text-sm px-3" onClick={onClose}>
              Cerrar
            </BtnOutline>
            <BtnPrimary
              className="h-9 text-sm px-3"
              onClick={() => {
                setEjecutado(true);
                toast.success("Análisis de conciliación ejecutado");
              }}
            >
              Ejecutar análisis
            </BtnPrimary>
          </div>
        </div>
      </div>
    </Modal>
  );
}
