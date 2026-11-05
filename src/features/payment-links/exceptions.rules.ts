import { type Excepcion } from "@/features/payment-links/credits.supabase";

/** Antiguedad en dias habiles (lunes a viernes). */
export function daysHabiles(fromIso: string) {
  const d = new Date(fromIso);
  const today = new Date();
  let n = 0;
  while (d < today) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6 && d <= today) n++;
  }
  return n;
}

export function esAccionable(r: Excepcion) {
  return r.clase === "aviso"
    ? r.advertencias.includes("diferencia_ventas")
    : r.excepcion_estado === "abierta";
}
