import { FormDialog } from "@/shared/ui/form-dialog";
import { BuscadorCustomer } from "@/features/alerts/components/buscador-customer";
import { inputCls } from "@/features/alerts/customer-monitoring-cards.rules";
import type { TransactionProfilesCardVm } from "./use-transaction-profiles-card";

export function TransactionProfileDialog({
  dialog,
  setDialog,
  draft,
  save,
  saving,
  setDraft,
  error,
}: Pick<
  TransactionProfilesCardVm,
  "dialog" | "setDialog" | "draft" | "save" | "saving" | "setDraft" | "error"
>) {
  return (
    <>
      {dialog && (
        <FormDialog
          open
          onClose={() => setDialog(false)}
          title={draft.editando ? "Editar perfil transaccional" : "Cargar perfil transaccional"}
          onSubmit={() => void save()}
          submitLabel={saving ? "Guardando…" : "Guardar"}
        >
          <div className="space-y-3">
            {draft.editando ? (
              <div className="text-sm">
                <span className="text-xs text-muted-foreground block">Cliente</span>
                <span className="font-medium">{draft.correo}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{draft.legajo}</span>
              </div>
            ) : (
              <BuscadorCustomer
                onSelect={(legajo, email) => setDraft((d) => ({ ...d, legajo, correo: email }))}
                seleccionado={draft.legajo}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">
                  Volumen mensual esperado ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.monto}
                  onChange={(e) => setDraft((d) => ({ ...d, monto: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">
                  Operaciones por mes (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.operaciones}
                  onChange={(e) => setDraft((d) => ({ ...d, operaciones: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Fundamento (opcional)</label>
              <textarea
                value={draft.notas}
                onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
                placeholder="Ej.: declaración jurada de ingresos, balance, facturación estimada…"
                className="w-full h-20 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </div>
        </FormDialog>
      )}
    </>
  );
}
