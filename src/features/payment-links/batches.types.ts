/** Estado que ve el operador: Pendiente, Acreditado, Adelantado o Contracargo (+ Programado). */
export type StatusMostrado =
  | "Programado"
  | "Pendiente"
  | "Acreditado"
  | "Adelantado"
  | "Contracargo"
  | "Cancelado"
  | "Liquidado";

export type SummaryMerchant = {
  comercio: string;
  legajo: string;
  comercioId: string;
  cantidadLotes: number;
  cantidadOps: number;
  totalBruto: number;
  totalImpuestos: number;
  totalPayWay: number;
  totalMoliPay: number;
  totalContracargo: number;
  totalAdelantos: number;
  totalFinal: number;
  pendienteAcreditar: number;
  pendienteImpuestos: number;
};
