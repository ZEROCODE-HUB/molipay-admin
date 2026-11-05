import type { ConfigFee,ModalidadFee } from "@/features/customers/customers.data";

export type ParametersCobro = {
  modalidad: ModalidadFee;
  porcentaje: number | null;
  montoFijo: number | null;
  montoOperacion: number;
};

/**
 * Calcula el monto de comisión de MoliPay para una operación.
 * - Modalidad porcentaje: comisión = montoOperación × %comisión / 100
 * - Modalidad fija (extensión futura): comisión = montoFijo
 */
export function calcularFee({
  modalidad,
  porcentaje,
  montoFijo: amountFixed,
  montoOperacion: amountOperation,
}: ParametersCobro): number {
  if (modalidad === "Fijo") return amountFixed ?? 0;
  return amountOperation * ((porcentaje ?? 0) / 100);
}

export type Desglose = {
  comision: number;
  impuesto: number;
  total: number;
  porcentajeImpuesto: number;
};

/**
 * Desglose del cobro al cliente:
 *   monto cobrado = comisión × (1 + impuesto%)
 * Devuelve los tres componentes por separado (Comisión / Impuesto / Total).
 * El impuesto es el que MoliPay retiene y paga por el servicio (hoy IVA 21%),
 * NO debe confundirse con retenciones al cliente (IIBB, débito/crédito).
 */
export function calcularDesglose(fee: number, porcentajeTax: number): Desglose {
  const tax = fee * (porcentajeTax / 100);
  return { comision: fee, impuesto: tax, total: fee + tax, porcentajeImpuesto: porcentajeTax };
}

export function desgloseFromConfig(config: ConfigFee, amountOperation: number): Desglose {
  const fee = calcularFee({
    modalidad: config.modalidad,
    porcentaje: config.porcentaje,
    montoFijo: config.montoFijo,
    montoOperacion: amountOperation,
  });
  return calcularDesglose(fee, config.porcentajeImpuesto);
}

/**
 * Desglose de referencia para la demo: 1% de comisión + 21% de IVA,
 * es decir se cobra un 1,21% sobre el monto de la operación (ejemplo de la definición).
 */
export function desgloseDemo(amountOperation: number, porcentajeTax = 21): Desglose {
  return calcularDesglose(
    calcularFee({
      modalidad: "Porcentaje",
      porcentaje: 1,
      montoFijo: null,
      montoOperacion: amountOperation,
    }),
    porcentajeTax,
  );
}

const ars = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (n: number) => `${ars(n)}%`;
