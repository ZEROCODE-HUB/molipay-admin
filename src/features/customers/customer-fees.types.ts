import {
type KindOperation,
type ModalidadFee,
type StatusFee,
} from "@/infrastructure/supabase/legacy/types";

export type Fee = {
  id: string;
  legajo: string;
  correo: string;
  cuit: string;
  tipoPersona: "fisica" | "juridica";
  operacion: string;
  tipo: KindOperation;
  modalidad: ModalidadFee;
  estado: StatusFee;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  descripcion: string;
  /** CVU al que aplica la comisión (null = comisión del cliente, respaldo). */
  subcuentaId: string | null;
  cvu: string | null;
};

export type FeeDraft = {
  id?: string;
  correo: string;
  /** Legajo del cliente elegido (para listar sus CVUs). */
  legajo: string;
  cuit: string;
  tipoPersona: "fisica" | "juridica";
  /** CVU al que aplica; null = comisión del cliente (respaldo de todos sus CVUs). */
  subcuentaId: string | null;
  tipo: KindOperation;
  modalidad: ModalidadFee;
  porcentaje: number | null;
  montoFijo: number | null;
  porcentajeImpuesto: number;
  /** Solo puede haber una Habilitada por CVU (o por cliente) y tipo. */
  estado: StatusFee;
  descripcion: string;
};
