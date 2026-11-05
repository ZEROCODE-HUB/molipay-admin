import { usePaymentMethodsPage } from "@/features/merchants/components/use-payment-methods-page";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Modal } from "@/shared/ui/modal";
import { MethodPaymentModal } from "./method-payment-modal";

export function PaymentMethodsPage() {
  const vm = usePaymentMethodsPage();
  const {
    data,
    loading,
    modal,
    setModal,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
    getActions,
    columns,
  } = vm;

  return (
    <>
      <PageHeader
        title="Métodos de pago"
        description="Gestión de métodos de pago disponibles para comercios."
        action={
          <BtnPrimary type="button" onClick={() => setModal({ metodo: null })}>
            <Plus size={14} /> Crear método de pago
          </BtnPrimary>
        }
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando métodos de pago...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(r) => r.id}
          pageSize={10}
          actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        />
      )}
      {modal && (
        <MethodPaymentModal
          metodo={modal.metodo}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.metodo ? () => setConfirmDelete(modal.metodo) : undefined}
        />
      )}
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} size="custom" className="max-w-md">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h3 className="font-display text-lg font-semibold">¿Eliminar método de pago?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer. Se eliminarán también las cuotas asociadas.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <BtnOutline onClick={() => setConfirmDelete(null)}>Cancelar</BtnOutline>
              <BtnPrimary
                onClick={() => handleDelete(confirmDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </BtnPrimary>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
