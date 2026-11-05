import type { Rate,AddressRate } from "@/infrastructure/supabase/legacy/types";

export const LABEL_ADDRESS: Record<AddressRate, string> = {
  Entrante: "Entrante (Pay-In)",
  Saliente: "Saliente (Pay-Out)",
  Ambas: "Ambas",
};

const today = () => new Date().toISOString().slice(0, 10);

export const numRate = (v: number, dec = 2) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: 4 });

export function formatValue(a: Pick<Rate, "tipoCalculo" | "valor">) {
  return a.tipoCalculo === "Porcentaje" ? `${numRate(a.valor)}%` : `$ ${numRate(a.valor)}`;
}

export const effectiveToday = (a: Rate) =>
  a.estado === "Activo" &&
  a.vigenciaDesde <= today() &&
  (!a.vigenciaHasta || a.vigenciaHasta >= today());
