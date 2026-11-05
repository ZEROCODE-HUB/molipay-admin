import { type StatusCustomer } from "@/infrastructure/supabase/legacy/types";

export type JuridicaRow = {
  id: string;
  legajo: string;
  correo: string;
  cuit: string;
  cuitFormatted: string;
  razonSocial: string;
  nombreFantasia: string | null;
  tipoSociedadRaw: string | null;
  tipoLabel: string;
  estadoRaw: StatusCustomer;
  estadoLabel: string;
  estadoTone: "success" | "warn" | "danger" | "neutral";
  fechaRegistro: string;
  esPep: boolean;
  comerciosCount: number;
  cvuCount: number;
};
