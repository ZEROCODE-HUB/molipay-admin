import { Modal as BaseModal } from "@/shared/ui/modal";
import { type ReactNode } from "react";
import { X } from "lucide-react";

export function TaxModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <BaseModal
      open
      onClose={onClose ?? (() => undefined)}
      dismissible={!!onClose}
      size="custom"
      className="max-w-3xl"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-md"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
