import { useQuery,useQueryClient } from "@tanstack/react-query";
import {
deleteClientBlockParameter,
getClientBlockParameter,
listAlertRules,
saveClientBlockParameter,
} from "@/features/alerts/alert-rules.supabase";
import { readSmvm } from "@/features/regulatory-reports/compliance.supabase";
import { useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { Pencil,ShieldAlert,Trash2 } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Cabecera } from "./customer-monitoring-cards-parts";
import { btnCls,inputCls } from "@/features/alerts/customer-monitoring-cards.rules";

/** Umbral de bloqueo por salarios mínimos depositados: individual del cliente o general. */
export function UmbralBlockCustomerCard({
  legajo,
  tipoPersona: personType,
}: {
  legajo: string;
  tipoPersona: "fisica" | "juridica";
}) {
  const queryClient = useQueryClient();
  const individual = useQuery({
    queryKey: ["client_block_parameters", "cliente", legajo],
    queryFn: () => getClientBlockParameter(legajo),
  });
  const rules = useQuery({ queryKey: ["alert_rules"], queryFn: listAlertRules });
  const smvm = useQuery({ queryKey: ["smvm"], queryFn: readSmvm });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const rule = rules.data?.find((r) => r.code === "deposit_min_wages_block");
  const field = personType === "juridica" ? "company_min_wages" : "individual_min_wages";
  const general =
    typeof rule?.parameters[field] === "number" ? (rule.parameters[field] as number) : null;
  const propio = individual.data
    ? personType === "juridica"
      ? individual.data.companyMinWages
      : individual.data.individualMinWages
    : null;
  const efectivo = propio ?? general;
  const valueSmvm = smvm.data ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["client_block_parameters"] });

  const save = async () => {
    const n = value.trim() === "" ? null : Number(value);
    if (n === null || !Number.isInteger(n) || n < 0)
      return toast.error("Ingresá una cantidad entera de salarios mínimos");
    setSaving(true);
    try {
      await saveClientBlockParameter({
        id: individual.data?.id,
        legajo,
        individualMinWages:
          personType === "fisica" ? n : (individual.data?.individualMinWages ?? null),
        companyMinWages: personType === "juridica" ? n : (individual.data?.companyMinWages ?? null),
      });
      await refresh();
      toast.success("Umbral individual guardado");
      setEditing(false);
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!individual.data) return;
    try {
      await deleteClientBlockParameter(individual.data.id);
      await refresh();
      toast.success("El cliente vuelve a usar el umbral general");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <Cabecera icon={<ShieldAlert size={13} />} titulo="Bloqueo por salarios mínimos">
        {propio != null && (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={btnCls}
            title="Volver al umbral general"
          >
            <Trash2 size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setValue(propio != null ? String(propio) : "");
            setEditing(true);
          }}
          className={btnCls}
        >
          <Pencil size={12} /> {propio != null ? "Editar" : "Personalizar"}
        </button>
      </Cabecera>

      {individual.isLoading || rules.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : individual.isError ? (
        <p className="text-xs text-red-600">No se pudo cargar: {userMessage(individual.error)}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Umbral mensual</div>
            <div className="text-sm font-semibold tabular-nums">
              {efectivo != null ? `${efectivo} SMVM` : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {propio != null ? "Individual de este cliente" : "General (Parámetros de bloqueos)"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Equivale a</div>
            <div className="text-sm font-semibold tabular-nums">
              {efectivo != null && valueSmvm > 0 ? formatMoney(efectivo * valueSmvm) : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {valueSmvm > 0
                ? `SMVM ${formatMoney(valueSmvm)}`
                : "SMVM sin configurar: la regla no se evalúa"}
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Si los depósitos del mes alcanzan el umbral, la cuenta se bloquea y el depósito queda
        retenido{rule && !rule.isEnabled ? " (la regla está deshabilitada)" : ""}.
      </p>

      {editing && (
        <FormDialog
          open
          onClose={() => setEditing(false)}
          title="Umbral individual de bloqueo"
          description={`Reemplaza al general (${general ?? "—"} SMVM) solo para este cliente.`}
          onSubmit={() => void save()}
          submitLabel={saving ? "Guardando…" : "Guardar"}
        >
          <label className="text-xs font-semibold mb-1.5 block">
            Salarios mínimos depositados por mes (
            {personType === "juridica" ? "empresa" : "persona"})
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
          />
        </FormDialog>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={remove}
        title="Volver al umbral general"
        message="Se elimina el umbral individual y el cliente usa el valor general de Parámetros de bloqueos."
        confirmLabel="Confirmar"
      />
    </div>
  );
}
