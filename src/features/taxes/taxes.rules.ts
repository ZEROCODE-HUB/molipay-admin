import {
type AmbitoTax,
type RateInput,
type SourceRate,
} from "@/infrastructure/supabase/legacy/types";
import { type RateForm } from "./taxes.types";

export const PAGE_SIZE = 10;
export const RATE_PAGE_SIZE = 8;

export const HELP_AMBITO: Record<AmbitoTax, string> = {
  Externo: "Se retiene al cliente (DyC, IIBB).",
  Interno: "Costo propio de MoliPay.",
};

export const HELP_SOURCE: Record<SourceRate, string> = {
  Fija: "Alícuotas definidas acá (por ley), por dirección y vigencia. Ej.: Débitos y Créditos.",
  Padrón: "Se consulta por CUIT en el padrón vigente del mes. Ej.: Ingresos Brutos.",
  Manual: "Se define por cliente en Impuestos › Usuarios.",
};

export const selectCls =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

export const today = () => new Date().toISOString().slice(0, 10);

export function statusTone(status: "Activo" | "Inactivo"): "success" | "neutral" {
  return status === "Activo" ? "success" : "neutral";
}

export const num = (v: number, dec = 2) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: 4 });

export function dateCorta(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const rateVacia = (): RateForm => ({
  codigo: "",
  tipoCalculo: "Porcentaje",
  valor: "",
  direccion: "Ambas",
  vigenciaDesde: today(),
  vigenciaHasta: "",
  descripcion: "",
  estado: "Activo",
});

export function errorRate(f: RateForm): string | null {
  if (!f.codigo.trim()) return "Falta el código.";
  if (f.valor.trim() === "" || Number.isNaN(Number(f.valor))) return "Falta el valor.";
  const v = Number(f.valor);
  if (v < 0) return "El valor no puede ser negativo.";
  if (f.tipoCalculo === "Porcentaje" && v > 100) return "El porcentaje no puede superar 100.";
  if (!f.vigenciaDesde) return "Falta la fecha de inicio de vigencia.";
  if (f.vigenciaHasta && f.vigenciaHasta < f.vigenciaDesde)
    return "La vigencia termina antes de empezar.";
  return null;
}

export const aInput = (f: RateForm): RateInput => ({
  codigo: f.codigo,
  tipoCalculo: f.tipoCalculo,
  valor: Number(f.valor),
  direccion: f.direccion,
  descripcion: f.descripcion || null,
  estado: f.estado,
  vigenciaDesde: f.vigenciaDesde,
  vigenciaHasta: f.vigenciaHasta || null,
});
