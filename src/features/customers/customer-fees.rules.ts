import { type KindOperation } from "@/infrastructure/supabase/legacy/types";
import { desgloseFromConfig,fmtPct,type Desglose } from "@/shared/lib/fee-schedule";
import { formatMoney } from "@/shared/lib/format";
import { type Fee } from "./customer-fees.types";

export const PAGE_SIZES = [10, 20, 50];

export const KINDS_FEE_USERS: KindOperation[] = ["Depósito", "Retiro"];

export const AMOUNT_OPERATION_REF = 100000;

export const desgloseDe = (
  c: Pick<Fee, "tipo" | "modalidad" | "porcentaje" | "montoFijo" | "porcentajeImpuesto">,
): Desglose =>
  desgloseFromConfig(
    {
      operacion: c.tipo,
      tipo: c.tipo,
      modalidad: c.modalidad,
      porcentaje: c.porcentaje,
      montoFijo: c.montoFijo,
      porcentajeImpuesto: c.porcentajeImpuesto,
    },
    AMOUNT_OPERATION_REF,
  );

export const configLabel = (c: Fee) =>
  c.modalidad === "Fijo" ? formatMoney(c.montoFijo ?? 0) : fmtPct(c.porcentaje ?? 0);
