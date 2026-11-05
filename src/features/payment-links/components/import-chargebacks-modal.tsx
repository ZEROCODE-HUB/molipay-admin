import { useImportChargebacksModal } from "@/features/payment-links/components/use-import-chargebacks-modal";
import { Modal } from "@/shared/ui/modal";
import { ChargebackImportStep } from "@/features/payment-links/components/chargeback-import-step";

export function ImportarChargebacksModal(props: { onClose: () => void }) {
  const vm = useImportChargebacksModal(props);
  const { onClose } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-3xl">
      <ChargebackImportStep {...vm} />
    </Modal>
  );
}
