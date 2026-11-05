import {
ADDRESS_DE_OPERATION,
OPERATIONS_TAX,
type KindCalculoRate,
type OperationTax,
type SourceRate,
type TaxAssignment,
type TaxAssignmentInput,
} from "@/infrastructure/supabase/legacy/types";
import { useTaxesForAssignment } from "@/features/taxes/taxes.hooks";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useCustomersForSelect } from "@/features/merchants/merchants.hooks";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label } from "@/shared/ui/form-controls";
import { Search } from "lucide-react";
import { formatValue } from "@/shared/lib/tax-format";
import { type AssignmentForm } from "@/features/taxes/tax-users.types";
import { LABEL_SOURCE,LEGAJO_RE,aInput } from "@/features/taxes/tax-users.rules";
import { selectCls } from "@/features/taxes/taxes.rules";
import { PrevisionRate } from "./prevision-rate";

export function AssignmentFormModal({
  asignacion: assignment,
  onClose,
  onSave,
}: {
  asignacion: TaxAssignment | null;
  onClose: () => void;
  onSave: (input: TaxAssignmentInput) => void;
}) {
  const { rows: taxesAvailables } = useTaxesForAssignment();
  const [form, setForm] = useState<AssignmentForm>(() => ({
    clienteLegajo: assignment?.clienteLegajo ?? "",
    impuestoId: assignment?.impuestoId ?? "",
    estado: assignment?.estado ?? "Activo",
    operacion: assignment?.operacion ?? "",
    tipoCalculo: assignment?.tipoCalculo ?? "Porcentaje",
    alicuotaPropia:
      assignment?.alicuotaPropia === null || assignment?.alicuotaPropia === undefined
        ? ""
        : String(assignment.alicuotaPropia),
  }));
  const [customerSearchInput, setCustomerSearchInput] = useState(form.clienteLegajo);
  const debouncedCustomerSearch = useDebouncedValue(customerSearchInput, 350);
  const { data: customersFiltrados } = useCustomersForSelect(
    assignment ? undefined : debouncedCustomerSearch,
  );
  const customersOptions = customersFiltrados ?? [];
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const tax = taxesAvailables.find((i) => i.id === form.impuestoId) ?? null;
  // Al editar, el impuesto puede estar inactivo (no figura en la lista).
  const source: SourceRate | null =
    tax?.fuenteAlicuota ??
    (assignment?.impuestoId === form.impuestoId
      ? (assignment?.impuesto?.fuenteAlicuota ?? null)
      : null);
  const esManual = source === "Manual";

  const legajoValid = LEGAJO_RE.test(form.clienteLegajo.trim());
  const rateNum = Number(form.alicuotaPropia.replace(",", "."));
  const rateValida =
    !esManual ||
    (form.alicuotaPropia.trim() !== "" &&
      Number.isFinite(rateNum) &&
      rateNum >= 0 &&
      (form.tipoCalculo !== "Porcentaje" || rateNum <= 100));
  const valid =
    form.clienteLegajo.trim() !== "" && legajoValid && form.impuestoId !== "" && rateValida;

  const save = () => {
    if (!valid) return;
    onSave(aInput(form, esManual));
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={assignment ? "Editar asignación" : "Nueva asignación de impuesto"}
      description={
        assignment
          ? `Modificá la asignación de ${assignment.clienteLegajo}.`
          : "Mientras la asignación esté activa, el impuesto se le cobra al comercio en las operaciones elegidas."
      }
      onSubmit={save}
      submitLabel={assignment ? "Guardar cambios" : "Crear asignación"}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="as-legajo">Usuario (correo / legajo)</Label>
          {assignment ? (
            <>
              <Input id="as-legajo" value={form.clienteLegajo} disabled />
              <p className="text-[11px] text-muted-foreground mt-1">
                El legajo no se puede modificar.
              </p>
            </>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="as-legajo"
                  value={customerSearchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomerSearchInput(v);
                    // si escribe legajo directo, sincroniza form
                    if (LEGAJO_RE.test(v.trim().toUpperCase())) {
                      setForm({ ...form, clienteLegajo: v.trim().toUpperCase() });
                    } else if (!v.trim()) {
                      setForm({ ...form, clienteLegajo: "" });
                    }
                    setComboboxOpen(true);
                  }}
                  onFocus={() => setComboboxOpen(true)}
                  onBlur={() => setTimeout(() => setComboboxOpen(false), 150)}
                  placeholder="Buscar por correo o legajo…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {comboboxOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-card shadow-lg max-h-60 overflow-auto">
                  {(customersOptions ?? []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {debouncedCustomerSearch
                        ? "Sin resultados."
                        : "Escribí correo o legajo para buscar (máx. 20)."}
                    </div>
                  ) : (
                    (customersOptions ?? []).map((c) => (
                      <button
                        key={c.legajo}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm({ ...form, clienteLegajo: c.legajo });
                          setCustomerSearchInput(`${c.correo} · ${c.legajo}`);
                          setComboboxOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col ${c.legajo === form.clienteLegajo ? "bg-accent" : ""}`}
                      >
                        <span className="font-medium">{c.correo}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.legajo} · {c.nombre}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Buscable por correo o legajo. Seleccioná un usuario de la lista.
              </p>
              {form.clienteLegajo && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Seleccionado: <span className="font-mono">{form.clienteLegajo}</span>
                </p>
              )}
              {form.clienteLegajo.trim() !== "" && !legajoValid && (
                <p className="text-xs text-red-600 mt-1">Formato inválido. Ej: LPF-20111111111.</p>
              )}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="as-impuesto">Impuesto</Label>
          <select
            id="as-impuesto"
            className={selectCls}
            value={form.impuestoId}
            disabled={!!assignment}
            onChange={(e) => setForm({ ...form, impuestoId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {assignment && !tax && assignment.impuesto && (
              <option value={assignment.impuestoId}>
                {assignment.impuesto.codigo} — {assignment.impuesto.nombre} (inactivo)
              </option>
            )}
            {taxesAvailables.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} — {i.nombre} · {LABEL_SOURCE[i.fuenteAlicuota]}
              </option>
            ))}
          </select>
          {assignment && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Para otro impuesto, creá una asignación nueva.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="as-tipo-operacion">Tipo de operación</Label>
          <select
            id="as-tipo-operacion"
            className={selectCls}
            value={form.operacion}
            onChange={(e) => setForm({ ...form, operacion: e.target.value as OperationTax | "" })}
          >
            <option value="">Todas las operaciones</option>
            {OPERATIONS_TAX.map((o) => (
              <option key={o} value={o}>
                {o} · {ADDRESS_DE_OPERATION[o] === "Saliente" ? "Pay-Out" : "Pay-In"}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Retiro cobra la alícuota saliente (Pay-Out); Depósito, Link de pago y E-commerce, la
            entrante (Pay-In).
          </p>
        </div>
        <div>
          <Label htmlFor="as-estado">Estado</Label>
          <select
            id="as-estado"
            className={selectCls}
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as "Activo" | "Inactivo" })}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        {esManual && (
          <>
            <div>
              <Label htmlFor="as-calculo">Cálculo</Label>
              <select
                id="as-calculo"
                className={selectCls}
                value={form.tipoCalculo}
                onChange={(e) =>
                  setForm({ ...form, tipoCalculo: e.target.value as KindCalculoRate })
                }
              >
                <option value="Porcentaje">Porcentaje</option>
                <option value="Monto fijo">Monto fijo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="as-alicuota">
                {form.tipoCalculo === "Porcentaje" ? "Alícuota (%)" : "Monto ($)"}
              </Label>
              <Input
                id="as-alicuota"
                inputMode="decimal"
                value={form.alicuotaPropia}
                onChange={(e) => setForm({ ...form, alicuotaPropia: e.target.value })}
                placeholder={form.tipoCalculo === "Porcentaje" ? "Ej: 3,5" : "Ej: 150"}
              />
              {!rateValida && form.alicuotaPropia.trim() !== "" && (
                <p className="text-xs text-red-600 mt-1">
                  {form.tipoCalculo === "Porcentaje"
                    ? "Entre 0 y 100."
                    : "Debe ser mayor o igual a 0."}
                </p>
              )}
            </div>
          </>
        )}

        {source && (
          <PrevisionRate
            clienteLegajo={form.clienteLegajo.trim()}
            impuestoId={form.impuestoId}
            fuente={source}
            operacion={form.operacion || null}
            manual={
              esManual && rateValida && form.alicuotaPropia.trim() !== ""
                ? formatValue({ tipoCalculo: form.tipoCalculo, valor: rateNum })
                : null
            }
          />
        )}
      </div>
      {!valid && (
        <p className="text-xs text-muted-foreground">
          {esManual
            ? "Completá el legajo, el impuesto y la alícuota para poder guardar."
            : "Completá el legajo y el impuesto para poder guardar."}
        </p>
      )}
    </FormDialog>
  );
}
