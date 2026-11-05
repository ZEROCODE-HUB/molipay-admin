import {
type AddressRate,
type AmbitoTax,
type KindCalculoRate,
type SourceRate,
} from "@/infrastructure/supabase/legacy/types";

// --- Alícuotas: formulario ----------------------------------------------------

export type RateForm = {
  codigo: string;
  tipoCalculo: KindCalculoRate;
  valor: string;
  direccion: AddressRate;
  vigenciaDesde: string;
  vigenciaHasta: string;
  descripcion: string;
  estado: "Activo" | "Inactivo";
};

// --- Form principal -----------------------------------------------------------

export type TaxForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: "Activo" | "Inactivo";
  ambito: AmbitoTax;
  fuenteAlicuota: SourceRate;
  alicuotas: RateForm[];
};
