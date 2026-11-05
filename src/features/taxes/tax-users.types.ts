import { type KindCalculoRate,type OperationTax } from "@/infrastructure/supabase/legacy/types";

export type AssignmentForm = {
  clienteLegajo: string;
  impuestoId: string;
  estado: "Activo" | "Inactivo";
  operacion: OperationTax | "";
  tipoCalculo: KindCalculoRate;
  alicuotaPropia: string;
};
