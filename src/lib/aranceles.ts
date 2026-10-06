import type { ConfigComision, ModalidadComision } from "@/data/clientes";

export type ParametrosCobro = {
  modalidad: ModalidadComision;
  porcentaje: number | null;
  montoFijo: number | null;
  montoOperacion: number;
};

/**
 * Calcula el monto de comisión de MoliPay para una operación.
 * - Modalidad porcentaje: comisión = montoOperación × %comisión / 100
 * - Modalidad fija (extensión futura): comisión = montoFijo
 */
export function calcularComision({
  modalidad,
  porcentaje,
  montoFijo,
  montoOperacion,
}: ParametrosCobro): number {
  if (modalidad === "Fijo") return montoFijo ?? 0;
  return montoOperacion * ((porcentaje ?? 0) / 100);
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
export function calcularDesglose(comision: number, porcentajeImpuesto: number): Desglose {
  const impuesto = comision * (porcentajeImpuesto / 100);
  return { comision, impuesto, total: comision + impuesto, porcentajeImpuesto };
}

export function desgloseDesdeConfig(config: ConfigComision, montoOperacion: number): Desglose {
  const comision = calcularComision({
    modalidad: config.modalidad,
    porcentaje: config.porcentaje,
    montoFijo: config.montoFijo,
    montoOperacion,
  });
  return calcularDesglose(comision, config.porcentajeImpuesto);
}

/**
 * Desglose de referencia para la demo: 1% de comisión + 21% de IVA,
 * es decir se cobra un 1,21% sobre el monto de la operación (ejemplo de la definición).
 */
export function desgloseDemo(montoOperacion: number, porcentajeImpuesto = 21): Desglose {
  return calcularDesglose(
    calcularComision({
      modalidad: "Porcentaje",
      porcentaje: 1,
      montoFijo: null,
      montoOperacion,
    }),
    porcentajeImpuesto,
  );
}

const ars = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtARS = (n: number) => `$ ${ars(n)}`;

export const fmtPct = (n: number) => `${ars(n)}%`;
