import type { ReactNode } from "react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import {
Modal,
ModalBody,
ModalFooter,
ModalHeader,
useModalTitleId,
type ModalSize,
} from "@/shared/ui/modal";

/** Modal con formulario: titulo, campos y botones Cancelar / Enviar. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Crear",
  size = "md",
  hideCancel = false,
  cancelLabel = "Cancelar",
  isSubmitting = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  size?: Extract<ModalSize, "md" | "lg" | "xl" | "2xl">;
  hideCancel?: boolean;
  cancelLabel?: string;
  isSubmitting?: boolean;
}) {
  const titleId = useModalTitleId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      labelledBy={titleId}
      dismissible={!isSubmitting}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <ModalHeader
          title={title}
          description={description}
          titleId={titleId}
          onClose={onClose}
          closeDisabled={isSubmitting}
        />
        <ModalBody className="space-y-4">{children}</ModalBody>
        <ModalFooter>
          {!hideCancel && (
            <BtnOutline type="button" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              {cancelLabel}
            </BtnOutline>
          )}
          <BtnPrimary type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            )}
            {submitLabel}
          </BtnPrimary>
        </ModalFooter>
      </form>
    </Modal>
  );
}
