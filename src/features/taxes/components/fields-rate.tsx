import { Input,Label } from "@/shared/ui/form-controls";
import {
ADDRESSES_RATE,
type AddressRate,
type KindCalculoRate,
} from "@/infrastructure/supabase/legacy/types";
import { LABEL_ADDRESS } from "@/shared/lib/tax-format";
import { type RateForm } from "@/features/taxes/taxes.types";
import { selectCls } from "@/features/taxes/taxes.rules";

export function FieldsRate({
  form,
  onChange,
  conEstado: withStatus,
}: {
  form: RateForm;
  onChange: (f: RateForm) => void;
  conEstado?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <Label>Código</Label>
        <Input
          value={form.codigo}
          onChange={(e) => onChange({ ...form, codigo: e.target.value.toUpperCase() })}
          placeholder="Ej: IN_06"
        />
      </div>
      <div>
        <Label>Cálculo</Label>
        <select
          className={selectCls}
          value={form.tipoCalculo}
          onChange={(e) => onChange({ ...form, tipoCalculo: e.target.value as KindCalculoRate })}
        >
          <option value="Porcentaje">Porcentaje</option>
          <option value="Monto fijo">Monto fijo</option>
        </select>
      </div>
      <div>
        <Label>{form.tipoCalculo === "Porcentaje" ? "Tasa (%)" : "Monto ($)"}</Label>
        <Input
          type="number"
          step="any"
          min="0"
          value={form.valor}
          onChange={(e) => onChange({ ...form, valor: e.target.value })}
          placeholder={form.tipoCalculo === "Porcentaje" ? "Ej: 0.60" : "Ej: 150"}
        />
      </div>
      <div>
        <Label>Dirección</Label>
        <select
          className={selectCls}
          value={form.direccion}
          onChange={(e) => onChange({ ...form, direccion: e.target.value as AddressRate })}
        >
          {ADDRESSES_RATE.map((d) => (
            <option key={d} value={d}>
              {LABEL_ADDRESS[d]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Vigente desde</Label>
        <Input
          type="date"
          value={form.vigenciaDesde}
          onChange={(e) => onChange({ ...form, vigenciaDesde: e.target.value })}
        />
      </div>
      <div>
        <Label>Vigente hasta</Label>
        <Input
          type="date"
          value={form.vigenciaHasta}
          onChange={(e) => onChange({ ...form, vigenciaHasta: e.target.value })}
        />
      </div>
      <div className={withStatus ? "" : "col-span-2"}>
        <Label>Descripción</Label>
        <Input
          value={form.descripcion}
          onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
          placeholder="Ej: Cobros entrantes"
        />
      </div>
      {withStatus && (
        <div>
          <Label>Estado</Label>
          <select
            className={selectCls}
            value={form.estado}
            onChange={(e) => onChange({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activa</option>
            <option value="Inactivo">Inactiva</option>
          </select>
        </div>
      )}
    </div>
  );
}
