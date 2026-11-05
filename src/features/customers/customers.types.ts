import { type StatusCustomer } from "@/infrastructure/supabase/legacy/types";
import { type RiskPLD } from "@/features/customers/customers.supabase";

export type User = {
  id: string;
  legajo: string;
  correo: string;
  nombres: string;
  cuit: string;
  cuitFormatted: string;
  estadoRaw: StatusCustomer;
  estadoLabel: string;
  estadoTone: "success" | "warn" | "danger" | "neutral";
  fechaRegistro: string;
  // Enrichment
  esPep: boolean;
  riesgo: RiskPLD | null;
  riesgoMotivo: string | null;
  kycCompleto: boolean;
  cvuCount: number;
  consumoMensualPct: number | null;
  limiteTransferencia: number | null;
};
