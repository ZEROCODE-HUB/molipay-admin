import { X } from "lucide-react";
import { BtnPrimary, BtnOutline } from "./portal-shell";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "default",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "default" | "danger";
}) {
  if (!open) return null;

  const confirmStyles = variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg w-full max-w-sm shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-2">
          <BtnOutline type="button" className="flex-1" onClick={onClose}>
            Cancelar
          </BtnOutline>
          <BtnPrimary
            type="button"
            className={`flex-1 ${confirmStyles}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}
