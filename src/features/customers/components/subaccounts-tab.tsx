import { type Subaccount } from "@/features/customers/subaccounts.supabase";
import { useSubaccountsTab } from "@/features/customers/components/use-subaccounts-tab";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { CheckCircle,PauseCircle,PlayCircle,Trash2 } from "lucide-react";
import { SubaccountParametersSection } from "@/features/customers/components/subaccount-parameters-section";

export function SubaccountDetailModal(props: {
  subcuenta: Subaccount;
  legajo: string;
  onClose: () => void;
  onValidar: (s: Subaccount) => void;
  onSuspender: (s: Subaccount) => void;
  onReactivar: (s: Subaccount) => void;
  onEliminar: (s: Subaccount) => void;
}) {
  const vm = useSubaccountsTab(props);
  const {
    subaccount,
    onClose,
    onValidate,
    onSuspend,
    onReactivate,
    onRemove,
    saving,
    saveConfig,
    btnAction,
  } = vm;

  return (
    <ModalDialog
      open
      onClose={onClose}
      title={`Subcuenta ${subaccount.nombre} ${subaccount.apellido}`.trim()}
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Nombre</p>
          <p className="text-sm font-medium">{subaccount.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Apellido</p>
          <p className="text-sm font-medium">{subaccount.apellido}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Correo asociado</p>
          <p className="text-sm font-medium">{subaccount.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          disabled={subaccount.validada}
          onClick={() => {
            onValidate(subaccount);
            onClose();
          }}
          className={btnAction("hover:bg-accent")}
        >
          <CheckCircle size={16} /> Validar
        </button>
        <button
          type="button"
          disabled={subaccount.estado === "Pausada"}
          onClick={() => {
            onSuspend(subaccount);
            onClose();
          }}
          className={btnAction("hover:bg-accent")}
        >
          <PauseCircle size={16} /> Suspender
        </button>
        <button
          type="button"
          disabled={subaccount.estado === "Activa"}
          onClick={() => {
            onReactivate(subaccount);
            onClose();
          }}
          className={btnAction("hover:bg-accent")}
        >
          <PlayCircle size={16} /> Reactivar
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onRemove(subaccount);
          }}
          className={btnAction("border-red-300 text-red-600 hover:bg-red-50")}
        >
          <Trash2 size={16} /> Eliminar
        </button>
      </div>

      <SubaccountParametersSection {...vm} />

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={saveConfig}
          disabled={saving}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </ModalDialog>
  );
}
