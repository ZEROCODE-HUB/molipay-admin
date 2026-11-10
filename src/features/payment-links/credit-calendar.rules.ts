import { type Capa, type StatusDay } from "./credit-calendar.types";

export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const CAPAS: { k: Capa; label: string; color: string; ayuda: string }[] = [
  {
    k: "programado",
    label: "Programada",
    color: "bg-amber-400",
    ayuda: "Fecha estimada futura; Payway todavía no pagó.",
  },
  {
    k: "pendiente",
    label: "Pendiente",
    color: "bg-sky-500",
    ayuda: "Llegó en el archivo; falta acreditarla.",
  },
  {
    k: "acreditado",
    label: "Completada",
    color: "bg-emerald-500",
    ayuda: "Ya acreditada al comercio.",
  },
  {
    k: "vencido",
    label: "Vencida",
    color: "bg-red-500",
    ayuda: "Pasó la fecha y no llegó en el archivo, o llegó y no se acreditó [A-18].",
  },
];

export const STATUSES_DAY: {
  k: StatusDay;
  titulo: string;
  singular: string;
  ayuda: string;
  color: string;
  borde: string;
  fondo: string;
  texto: string;
}[] = [
  {
    k: "acreditado",
    titulo: "Completadas",
    singular: "Completada",
    ayuda: "Ya son saldo del comercio",
    color: "bg-emerald-500",
    borde: "border-emerald-200",
    fondo: "bg-emerald-50/60",
    texto: "text-emerald-700",
  },
  {
    k: "pendiente",
    titulo: "Pendientes",
    singular: "Pendiente",
    ayuda: "Llegaron en el archivo de Payway; falta acreditar",
    color: "bg-sky-500",
    borde: "border-sky-200",
    fondo: "bg-sky-50/60",
    texto: "text-sky-700",
  },
  {
    k: "programado",
    titulo: "Programadas",
    singular: "Programada",
    ayuda: "Estimadas; Payway todavía no pagó",
    color: "bg-amber-400",
    borde: "border-amber-200",
    fondo: "bg-amber-50/60",
    texto: "text-amber-700",
  },
  {
    k: "vencido",
    titulo: "Vencidas",
    singular: "Vencida",
    ayuda: "Pasó la fecha y no se acreditó",
    color: "bg-red-500",
    borde: "border-red-200",
    fondo: "bg-red-50/60",
    texto: "text-red-700",
  },
];
