export type RowMerchant = {
  comercio_id: string;
  comercio: string;
  legajo: string;
  lotes: number;
  bruto: number;
  neto_payway: number;
  descuentos: number;
  compensaciones: number;
  neto_a_acreditar: number;
  acreditado: number;
  elegibles: string[];
  estado: string;
};
