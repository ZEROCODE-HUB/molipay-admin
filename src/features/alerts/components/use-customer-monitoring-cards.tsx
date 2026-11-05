import { parseMoneyInput } from "@/shared/lib/money";
import { userMessage } from "@/shared/lib/errors";
import { useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
deleteTransactionProfile,
getTransactionProfile,
saveTransactionProfile,
} from "@/features/alerts/alert-rules.supabase";

/** Estado y acciones de CustomerMonitoringCards: el componente solo dibuja. */
export function useCustomerMonitoringCards({ legajo }: { legajo: string }) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["transaction_profiles", "cliente", legajo],
    queryFn: () => getTransactionProfile(legajo),
  });
  const p = q.data ?? null;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ monto: "", ops: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["transaction_profiles"] });

  const open = () => {
    setForm({
      monto: p ? String(p.monthlyAmount) : "",
      ops: p?.monthlyOperations == null ? "" : String(p.monthlyOperations),
      notas: p?.notes ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    const parsedAmount = parseMoneyInput(form.monto);
    const amount = parsedAmount ? parsedAmount.cents / 100 : NaN;
    if (form.monto.trim() === "" || !Number.isFinite(amount) || amount < 0)
      return toast.error("Ingresá el volumen mensual esperado");
    const ops = form.ops.trim() === "" ? null : Number(form.ops);
    if (ops !== null && (!Number.isInteger(ops) || ops < 0))
      return toast.error("La cantidad de operaciones debe ser un entero");
    setSaving(true);
    try {
      await saveTransactionProfile({
        legajo,
        monthlyAmount: Math.round(amount * 100) / 100,
        monthlyOperations: ops,
        notes: form.notas.trim() || null,
      });
      await refresh();
      toast.success("Perfil transaccional guardado");
      setEditing(false);
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!p) return;
    try {
      await deleteTransactionProfile(p.id);
      await refresh();
      toast.success("Perfil eliminado: el cliente deja de evaluarse por exceso de perfil");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const pct =
    p && p.monthlyAmount > 0 ? Math.round((p.currentMonthAmount / p.monthlyAmount) * 100) : null;
  const tone =
    pct == null ? "" : pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return {
    legajo,
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
  };
}

export type CustomerMonitoringCardsVm = ReturnType<typeof useCustomerMonitoringCards>;
