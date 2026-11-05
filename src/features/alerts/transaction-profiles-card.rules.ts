import { type Draft } from "./transaction-profiles-card.types";

export const PAGE_SIZES = [10, 20, 50];
export const empty: Draft = {
  legajo: "",
  correo: "",
  monto: "",
  operaciones: "",
  notas: "",
  editando: false,
};
