import { type Health } from "@/features/system/integrations.rules";
/** Integracion configurada en la plataforma (tabla integraciones). */
export type Integration = {
  id: string;
  name: string;
  provider: string;
  createdAt: string;
};

export type IntegrationFilters = { page: number; pageSize: number; search?: string };

export type IntegrationPage = {
  rows: Integration[];
  total: number;
  page: number;
  pageSize: number;
};

export type IntegrationUI = {
  id: string;
  nombre: string;
  proveedor: string;
  salud: Health;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  ejecuciones: number;
};
