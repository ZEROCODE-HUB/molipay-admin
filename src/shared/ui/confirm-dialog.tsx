import { useState,type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Modal,ModalBody,ModalFooter,ModalHeader,useModalTitleId } from "@/shared/ui/modal";

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger": accion destructiva (boton rojo e icono de advertencia). */
  variant?: "default" | "danger";
};

/**
 * Confirmacion de una accion.
 * - `onConfirm` puede ser async: mientras corre se muestra "procesando" y no se puede cerrar.
 * - Si termina bien, el dialogo se cierra solo; si falla, queda abierto (quien llama muestra el error).
 * Para confirmar desde un handler sin estado propio, usar `useConfirm()` (confirm-provider.tsx).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  extraContent,
}: ConfirmOptions & {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  extraContent?: ReactNode;
}) {
  const titleId = useModalTitleId();
  const [loading, setLoading] = useState(false);
  const danger = variant === "danger";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Quien llama maneja y muestra el error; el dialogo queda abierto.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" labelledBy={titleId} dismissible={!loading}>
      <ModalHeader title={title} titleId={titleId} onClose={onClose} closeDisabled={loading} />
      <ModalBody>
        <div className="flex gap-3">
          {danger && (
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
          )}
          <div className="min-w-0 text-sm text-muted-foreground">{message}</div>
        </div>
        {extraContent}
      </ModalBody>
      <ModalFooter>
        <BtnOutline type="button" className="flex-1" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </BtnOutline>
        <BtnPrimary
          type="button"
          className={`flex-1 inline-flex items-center justify-center gap-2 ${danger ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {confirmLabel}
        </BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
