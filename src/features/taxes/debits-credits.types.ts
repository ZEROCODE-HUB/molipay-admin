import { type AddressExemption,type KindExemption } from "@/features/taxes/exemptions.supabase";

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

export type AltaForm = {
  cuit: string;
  impuestoId: string;
  direccion: AddressExemption | "Ambos";
  tipo: KindExemption;
  motivo: string;
  desde: string;
  hasta: string;
  codigo: string;
  certificado: File | null;
};
