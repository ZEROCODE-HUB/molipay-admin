import type { ReactNode } from "react";
import { Modal,ModalBody,ModalHeader,useModalTitleId,type ModalSize } from "@/shared/ui/modal";

/** Modal simple de contenido (detalle, informacion) con titulo y cierre. */
export function ModalDialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: Extract<ModalSize, "sm" | "md" | "lg" | "xl">;
}) {
  const titleId = useModalTitleId();
  return (
    <Modal open={open} onClose={onClose} size={size} labelledBy={titleId}>
      <ModalHeader title={title} description={description} titleId={titleId} onClose={onClose} />
      <ModalBody className="px-6 py-6">{children}</ModalBody>
    </Modal>
  );
}
