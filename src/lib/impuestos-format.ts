import type { Alicuota, DireccionAlicuota } from "@/lib/api/types";

export const ETIQUETA_DIRECCION: Record<DireccionAlicuota, string> = {
  Entrante: "Entrante (Pay-In)",
  Saliente: "Saliente (Pay-Out)",
  Ambas: "Ambas",
};

const hoy = () => new Date().toISOString().slice(0, 10);

export const numAlicuota = (v: number, dec = 2) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: 4 });

export function formatValor(a: Pick<Alicuota, "tipoCalculo" | "valor">) {
  return a.tipoCalculo === "Porcentaje" ? `${numAlicuota(a.valor)}%` : `$ ${numAlicuota(a.valor)}`;
}

export const vigenteHoy = (a: Alicuota) =>
  a.estado === "Activo" &&
  a.vigenciaDesde <= hoy() &&
  (!a.vigenciaHasta || a.vigenciaHasta >= hoy());
