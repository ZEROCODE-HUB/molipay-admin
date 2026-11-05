import { type StatusAdvance } from "@/infrastructure/supabase/legacy/types";

// Lo que la grilla necesita del comercio lo armamos via join para no
// mostrar el UUID crudo en la columna "Comercio".
export type MerchantSummary = {
  id: string;
  nombre: string;
  legajo: string;
};

export type AdvanceUI = {
  id: string;
  /** UUID real del adelanto (para llamar a las RPCs). */
  fullId: string;
  /** Texto a mostrar: nombre del comercio o, si no se pudo resolver, el UUID. */
  comercio: string;
  legajo: string;
  fechaSolicitud: string;
  importeSolicitado: number;
  operacion: string;
  plazoSolicitado: string;
  plazoContractual: string;
  comision: string;
  tasaEfectiva?: string;
  estado: StatusAdvance;
  notas?: string | null;
  tasaInteresPct?: number | null;
  motivo?: string | null;
  fechaAcreditacion?: string | null;
  montoPorAcreditar?: number | null;
  fechaResolucion?: string | null;
  /** Monto aprobado en la oferta. */
  montoOfertado?: number | null;
  descuento?: number | null;
  netoARecibir?: number | null;
  compensado?: number;
  rechazoMotivo?: string | null;
};
