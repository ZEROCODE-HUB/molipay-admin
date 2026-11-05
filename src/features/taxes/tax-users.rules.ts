import {
ADDRESS_DE_OPERATION,
OPERATIONS_TAX,
type SourceRate,
type TaxAssignment,
type TaxAssignmentInput,
} from "@/infrastructure/supabase/legacy/types";
import { formatValue } from "@/shared/lib/tax-format";
import { type AssignmentForm } from "./tax-users.types";

export const PAGE_SIZE = 10;
export const LEGAJO_RE = /^[A-Z]{3}-\d{11}$/;

export const LABEL_SOURCE: Record<SourceRate, string> = {
  Fija: "Alícuota fija",
  Padrón: "Padrón",
  Manual: "Manual",
};

export const OPERATIONS_BY_ADDRESS = {
  Entrante: OPERATIONS_TAX.filter((o) => ADDRESS_DE_OPERATION[o] === "Entrante"),
  Saliente: OPERATIONS_TAX.filter((o) => ADDRESS_DE_OPERATION[o] === "Saliente"),
};

/** Alicuota propia de un impuesto manual. */
export function ratePropiaLabel(a: Pick<TaxAssignment, "tipoCalculo" | "alicuotaPropia">) {
  if (a.tipoCalculo === null || a.alicuotaPropia === null) return "Sin alícuota";
  return formatValue({ tipoCalculo: a.tipoCalculo, valor: a.alicuotaPropia });
}

/** Payload para la API desde el formulario. */
export function aInput(form: AssignmentForm, manual: boolean): TaxAssignmentInput {
  return {
    cliente_legajo: form.clienteLegajo.trim(),
    impuesto_id: form.impuestoId,
    operacion: form.operacion || null,
    estado: form.estado,
    tipo_calculo: manual ? form.tipoCalculo : null,
    alicuota_propia: manual ? Number(form.alicuotaPropia.replace(",", ".")) : null,
  };
}
