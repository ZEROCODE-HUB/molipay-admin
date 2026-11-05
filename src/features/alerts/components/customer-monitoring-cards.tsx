import { useCustomerMonitoringCards } from "@/features/alerts/components/use-customer-monitoring-cards";
import { Activity,Pencil,Trash2 } from "lucide-react";
import { userMessage } from "@/shared/lib/errors";
import { formatMoney } from "@/shared/lib/format";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Cabecera } from "./customer-monitoring-cards-parts";
import { btnCls,inputCls } from "@/features/alerts/customer-monitoring-cards.rules";

/** Perfil transaccional esperado (base de la alerta "Exceso del perfil transaccional"). */
export function ProfileTransaccionalCustomerCard(props: { legajo: string }) {
  const vm = useCustomerMonitoringCards(props);
  const {
    q,
    p,
    editing,
    setEditing,
    deleting,
    setDeleting,
    form,
    setForm,
    saving,
    open,
    save,
    remove,
    pct,
    tone,
  } = vm;

  return (
    <div className="rounded-lg border border-border p-4">
      <Cabecera icon={<Activity size={13} />} titulo="Perfil transaccional esperado">
        {p && (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={btnCls}
            title="Eliminar perfil"
          >
            <Trash2 size={12} />
          </button>
        )}
        <button type="button" onClick={open} className={btnCls}>
          <Pencil size={12} /> {p ? "Editar" : "Cargar"}
        </button>
      </Cabecera>

      {q.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : q.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {userMessage(q.error)}</p>
      ) : !p ? (
        <p className="text-xs text-muted-foreground">
          Sin perfil cargado: la alerta "Exceso del perfil transaccional" no evalúa a este cliente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                Volumen mensual esperado
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatMoney(p.monthlyAmount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Operaciones por mes</div>
              <div className="text-sm font-semibold tabular-nums">
                {p.monthlyOperations ?? "Sin límite"}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>
                Este mes: {formatMoney(p.currentMonthAmount)} · {p.currentMonthOperations}{" "}
                operación(es)
              </span>
              {pct != null && <span className="font-semibold text-foreground">{pct}%</span>}
            </div>
            {pct != null && (
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            )}
          </div>
          {p.notes && <p className="mt-3 text-xs text-foreground">{p.notes}</p>}
        </>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Volumen = depósitos + transferencias salientes del mes calendario (sin internas).
      </p>

      {editing && (
        <FormDialog
          open
          onClose={() => setEditing(false)}
          title={p ? "Editar perfil transaccional" : "Cargar perfil transaccional"}
          onSubmit={() => void save()}
          submitLabel={saving ? "Guardando…" : "Guardar"}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">
                  Volumen mensual esperado ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
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
                  value={form.ops}
                  onChange={(e) => setForm((f) => ({ ...f, ops: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Fundamento (opcional)</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Ej.: declaración jurada de ingresos, balance, facturación estimada…"
                className="w-full h-20 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              />
            </div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={remove}
        title="Eliminar perfil transaccional"
        message="El cliente deja de evaluarse por exceso de perfil hasta que se le cargue uno nuevo."
        confirmLabel="Eliminar"
      />
    </div>
  );
}
