import { type Rate } from "@/infrastructure/supabase/legacy/types";
import { useState } from "react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { type RateForm } from "@/features/taxes/taxes.types";
import { errorRate,rateVacia } from "@/features/taxes/taxes.rules";
import { FieldsRate } from "./fields-rate";

export function RateFormModal({
  alicuota: rate,
  onClose,
  onSave,
}: {
  alicuota: Rate | null;
  onClose: () => void;
  onSave: (form: RateForm) => void;
}) {
  const [form, setForm] = useState<RateForm>(() =>
    rate
      ? {
          codigo: rate.codigo,
          tipoCalculo: rate.tipoCalculo,
          valor: String(rate.valor),
          direccion: rate.direccion,
          vigenciaDesde: rate.vigenciaDesde,
          vigenciaHasta: rate.vigenciaHasta ?? "",
          descripcion: rate.descripcion ?? "",
          estado: rate.estado,
        }
      : rateVacia(),
  );
  const error = errorRate(form);

  return (
    <FormDialog
      open
      onClose={onClose}
      size="lg"
      title={rate ? "Editar alícuota" : "Nueva alícuota"}
      description="Si la ley cambia la tasa, cerrá la vigencia de la actual y creá una nueva: así queda el historial."
      onSubmit={() => !error && onSave(form)}
      submitLabel={rate ? "Guardar cambios" : "Crear alícuota"}
    >
      <FieldsRate form={form} onChange={setForm} conEstado />
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </FormDialog>
  );
}
