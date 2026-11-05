import {
AMBITOS_TAX,
SOURCES_RATE,
type AmbitoTax,
type SourceRate,
type Tax,
} from "@/infrastructure/supabase/legacy/types";
import { useState } from "react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnOutline } from "@/shared/ui/button";
import { Plus,Trash2 } from "lucide-react";
import { type RateForm,type TaxForm } from "@/features/taxes/taxes.types";
import {
HELP_AMBITO,
HELP_SOURCE,
errorRate,
rateVacia,
selectCls,
} from "@/features/taxes/taxes.rules";
import { FieldsRate } from "./fields-rate";

export function TaxFormModal({
  impuesto: tax,
  onClose,
  onSave,
}: {
  impuesto: Tax | null;
  onClose: () => void;
  onSave: (form: TaxForm) => void;
}) {
  const [form, setForm] = useState<TaxForm>(() => ({
    codigo: tax?.codigo ?? "",
    nombre: tax?.nombre ?? "",
    descripcion: tax?.descripcion ?? "",
    estado: tax?.estado ?? "Activo",
    ambito: tax?.ambito ?? "Externo",
    fuenteAlicuota: tax?.fuenteAlicuota ?? "Fija",
    alicuotas: tax ? [] : [rateVacia()],
  }));

  const creando = !tax;
  const cargaRates = creando && form.fuenteAlicuota === "Fija";
  const errorAlic = cargaRates
    ? form.alicuotas.length === 0
      ? "Agregá al menos una alícuota."
      : (form.alicuotas.map(errorRate).find(Boolean) ?? null)
    : null;
  const valid = form.codigo.trim() !== "" && form.nombre.trim() !== "" && !errorAlic;
  const cambiaRate = (i: number, f: RateForm) =>
    setForm({ ...form, alicuotas: form.alicuotas.map((a, k) => (k === i ? f : a)) });

  return (
    <FormDialog
      open
      onClose={onClose}
      size="xl"
      title={tax ? "Editar impuesto" : "Nuevo impuesto"}
      description={
        tax
          ? `Modificá los datos del impuesto "${tax.nombre}". Las alícuotas se gestionan desde Ver detalles.`
          : "Definí el impuesto y de dónde sale su alícuota."
      }
      onSubmit={() => valid && onSave(form)}
      submitLabel={tax ? "Guardar cambios" : "Crear impuesto"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="im-codigo">Código</Label>
          <Input
            id="im-codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            placeholder="Ej: DEBITOS_CREDITOS"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Único entre los impuestos.</p>
        </div>
        <div>
          <Label htmlFor="im-nombre">Nombre</Label>
          <Input
            id="im-nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Débitos y Créditos"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="im-desc">Descripción</Label>
          <Input
            id="im-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="im-ambito">Ámbito</Label>
          <select
            id="im-ambito"
            className={selectCls}
            value={form.ambito}
            onChange={(e) => setForm({ ...form, ambito: e.target.value as AmbitoTax })}
          >
            {AMBITOS_TAX.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">{HELP_AMBITO[form.ambito]}</p>
        </div>
        <div>
          <Label htmlFor="im-estado">Estado</Label>
          <select
            id="im-estado"
            className={selectCls}
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="im-fuente">Fuente de la alícuota</Label>
          <select
            id="im-fuente"
            className={selectCls}
            value={form.fuenteAlicuota}
            onChange={(e) => setForm({ ...form, fuenteAlicuota: e.target.value as SourceRate })}
          >
            {SOURCES_RATE.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {HELP_SOURCE[form.fuenteAlicuota]}
          </p>
        </div>
      </div>

      {cargaRates && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alícuotas ({form.alicuotas.length})
            </h4>
            <BtnOutline
              type="button"
              onClick={() => setForm({ ...form, alicuotas: [...form.alicuotas, rateVacia()] })}
            >
              <Plus size={13} /> Agregar alícuota
            </BtnOutline>
          </div>
          {form.alicuotas.map((a, i) => (
            <div key={i} className="relative rounded-lg border border-border p-3 pr-10">
              <FieldsRate form={a} onChange={(f) => cambiaRate(i, f)} />
              <button
                type="button"
                title="Quitar"
                className="absolute right-2 top-2 p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                onClick={() =>
                  setForm({ ...form, alicuotas: form.alicuotas.filter((_, k) => k !== i) })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {creando && form.fuenteAlicuota === "Padrón" && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Este impuesto no lleva alícuotas: se toman del padrón vigente cargado en Ingresos Brutos,
          por CUIT.
        </div>
      )}
      {tax && tax.fuenteAlicuota === "Fija" && form.fuenteAlicuota !== "Fija" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Para dejar de usar alícuotas fijas, primero desactivá las alícuotas del impuesto desde Ver
          detalles.
        </div>
      )}

      {!valid && (
        <p className="text-xs text-muted-foreground">
          {errorAlic ?? "Completá el código y el nombre para poder guardar."}
        </p>
      )}
    </FormDialog>
  );
}
