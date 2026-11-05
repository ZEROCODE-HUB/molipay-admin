import { userMessage } from "@/shared/lib/errors";
import { useState,useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
type Subaccount,
type SubaccountConfiguracion,
type SubaccountParam,
type SubaccountFee,
updateSubaccount,
} from "@/features/customers/subaccounts.supabase";
import {
DEFAULT_PARAMS_ALERTS,
DEFAULT_PARAMS_BLOCK,
} from "@/features/customers/customer-modal.rules";

/** Estado y acciones de SubaccountsTab: el componente solo dibuja. */
export function useSubaccountsTab({
  subcuenta: subaccount,
  legajo,
  onClose,
  onValidar: onValidate,
  onSuspender: onSuspend,
  onReactivar: onReactivate,
  onEliminar: onRemove,
}: {
  subcuenta: Subaccount;
  legajo: string;
  onClose: () => void;
  onValidar: (s: Subaccount) => void;
  onSuspender: (s: Subaccount) => void;
  onReactivar: (s: Subaccount) => void;
  onEliminar: (s: Subaccount) => void;
}) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<SubaccountConfiguracion>({
    alertas: subaccount.configuracion?.alertas ?? [],
    bloqueos: subaccount.configuracion?.bloqueos ?? [],
    comisiones: subaccount.configuracion?.comisiones ?? [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig((c) => ({
      alertas: c.alertas.length ? c.alertas : DEFAULT_PARAMS_ALERTS.map((p) => ({ ...p })),
      bloqueos: c.bloqueos.length ? c.bloqueos : DEFAULT_PARAMS_BLOCK.map((p) => ({ ...p })),
      comisiones: c.comisiones ?? [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await updateSubaccount(legajo, subaccount.id, { configuracion: config });
      await queryClient.invalidateQueries({ queryKey: ["subcuentas", legajo] });
      toast.success("Configuración de subcuenta guardada");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const actualizarParam = (
    section: "alertas" | "bloqueos",
    idx: number,
    change: Partial<SubaccountParam>,
  ) =>
    setConfig((c) => ({
      ...c,
      [section]: c[section].map((p, i) => (i === idx ? { ...p, ...change } : p)),
    }));
  const addParam = (section: "alertas" | "bloqueos") =>
    setConfig((c) => ({
      ...c,
      [section]: [...c[section], { label: "Nuevo parámetro", valor: "" }],
    }));
  const quitarParam = (section: "alertas" | "bloqueos", idx: number) =>
    setConfig((c) => ({ ...c, [section]: c[section].filter((_, i) => i !== idx) }));

  const actualizarFee = (idx: number, change: Partial<SubaccountFee>) =>
    setConfig((c) => ({
      ...c,
      comisiones: c.comisiones.map((x, i) => (i === idx ? { ...x, ...change } : x)),
    }));
  const addFee = () =>
    setConfig((c) => ({
      ...c,
      comisiones: [
        ...c.comisiones,
        { id: crypto.randomUUID(), tipo: "", monto: "", fecha: "", origen: "" },
      ],
    }));
  const quitarFee = (idx: number) =>
    setConfig((c) => ({ ...c, comisiones: c.comisiones.filter((_, i) => i !== idx) }));

  const btnAction = (extra: string) =>
    `inline-flex items-center gap-1.5 h-9 rounded-md border px-3 text-sm font-medium transition disabled:opacity-40 ${extra}`;
  return {
    subaccount,
    legajo,
    onClose,
    onValidate,
    onSuspend,
    onReactivate,
    onRemove,
    config,
    saving,
    saveConfig,
    actualizarParam,
    addParam,
    quitarParam,
    actualizarFee,
    addFee,
    quitarFee,
    btnAction,
  };
}

export type SubaccountsTabVm = ReturnType<typeof useSubaccountsTab>;
