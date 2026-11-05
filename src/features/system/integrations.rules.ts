import { AlertTriangle,CheckCircle2,XCircle } from "lucide-react";

export type Health = "ok" | "warning" | "error";

export const healthMeta: Record<
  Health,
  { label: string; tone: "success" | "warn" | "danger"; icon: typeof CheckCircle2 }
> = {
  ok: { label: "Funcionando correctamente", tone: "success", icon: CheckCircle2 },
  warning: { label: "Ejecución reciente con demoras", tone: "warn", icon: AlertTriangle },
  error: { label: "Última ejecución fallida", tone: "danger", icon: XCircle },
};

export const mockHealth: Record<string, Health> = {
  "pct:wondersoft": "ok",
  "pds:pago_mis_cuentas": "ok",
  "bank.bdc_conecta": "warning",
  "cpf:coelsa_cpf": "ok",
  "pct:coelsa_cvu": "ok",
  "pct:coelsa_debin": "error",
};

export const mockUltimaExecution: Record<string, string> = {
  "pct:wondersoft": "11/08/2026 08:00",
  "pds:pago_mis_cuentas": "11/08/2026 07:55",
  "bank.bdc_conecta": "11/08/2026 07:30",
  "cpf:coelsa_cpf": "11/08/2026 08:05",
  "pct:coelsa_cvu": "11/08/2026 08:02",
  "pct:coelsa_debin": "11/08/2026 07:45",
};

export const mockProximaExecution: Record<string, string> = {
  "pct:wondersoft": "11/08/2026 08:15",
  "pds:pago_mis_cuentas": "11/08/2026 08:10",
  "bank.bdc_conecta": "11/08/2026 08:00",
  "cpf:coelsa_cpf": "11/08/2026 08:20",
  "pct:coelsa_cvu": "11/08/2026 08:17",
  "pct:coelsa_debin": "11/08/2026 08:10",
};

export const mockExecutions: Record<string, number> = {
  "pct:wondersoft": 12480,
  "pds:pago_mis_cuentas": 8931,
  "bank.bdc_conecta": 4572,
  "cpf:coelsa_cpf": 21003,
  "pct:coelsa_cvu": 20177,
  "pct:coelsa_debin": 18954,
};

export const proximoGrupo = ["pct:wondersoft", "pds:pago_mis_cuentas", "cpf:coelsa_cpf"];
