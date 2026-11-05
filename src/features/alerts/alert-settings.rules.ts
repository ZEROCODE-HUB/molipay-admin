import {
type ActivityAmount,
type AlertRule,
type MinorsPolicy,
type ScheduleDay,
} from "@/features/alerts/alert-rules.supabase";
import { normalizeValue } from "@/features/alerts/components/chips-select";
import { type Draft,type GroupView,type RuleToSave } from "./alert-settings.types";

export const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const GROUPS: GroupView[] = [
  {
    title: "Límite de depósitos excedidos",
    rules: [
      {
        code: "deposit_company_max",
        switchLabel: "Depósito por empresa",
        numbers: [{ key: "max_amount", label: "Depósito por empresa (monto máx.)" }],
      },
      {
        code: "deposit_min_wages",
        switchLabel: "Límite de depósito excedido",
        numbers: [
          { key: "min_wages_count", label: "Salario mínimo (cantidad)", integer: true },
          {
            key: "min_wage_deposits_per_transfer",
            label: "Depósitos de salario mínimo por transferencia",
            integer: true,
          },
        ],
      },
    ],
  },
  {
    title: "Límite de depósito mensual",
    rules: [
      {
        code: "deposit_monthly_limit",
        switchLabel: "Límite de depósito mensual",
        numbers: [
          { key: "monthly_amount", label: "Monto del límite de depósito mensual" },
          { key: "same_origin_monthly_amount", label: "Depósito de un mismo origen por mes" },
        ],
      },
    ],
  },
  {
    title: "Máximo de intentos fallidos por retiro",
    rules: [
      {
        code: "withdrawal_failed_attempts",
        switchLabel: "Control de intentos fallidos",
        numbers: [
          { key: "max_attempts", label: "Intentos fallidos permitidos", integer: true },
          {
            key: "window_seconds",
            label: "Tiempo de evaluación de retiros fallidos (segundos)",
            integer: true,
          },
        ],
      },
    ],
  },
  {
    title: "Transferencias repetidas",
    rules: [
      {
        code: "repeated_transfers",
        switchLabel: "Operaciones repetitivas",
        numbers: [
          {
            key: "threshold",
            label: "Umbral de operaciones repetidas (mismo destino)",
            integer: true,
          },
          { key: "window_minutes", label: "Ventana de evaluación (minutos)", integer: true },
        ],
      },
    ],
  },
  {
    title: "Transferencias por hora",
    rules: [
      {
        code: "transfers_per_hour",
        switchLabel: "Límite de transferencias por hora",
        numbers: [
          { key: "max_per_hour", label: "Transferencias por hora (máximo)", integer: true },
        ],
      },
    ],
  },
  {
    title: "Afinidad entre cuentas (solo transferencias entre cuentas empresa)",
    rules: [
      {
        code: "company_account_affinity",
        switchLabel: "Afinidad entre cuentas",
        numbers: [
          { key: "threshold", label: "Afinidad entre cuentas (umbral)", integer: true },
          { key: "window_days", label: "Ventana de evaluación (días)", integer: true },
        ],
      },
    ],
  },
  {
    title: "Volumen anormal de operación",
    rules: [
      {
        code: "abnormal_volume",
        switchLabel: "Alerta de volumen habilitada",
        numbers: [
          { key: "min_amount", label: "Monto mínimo por operación" },
          { key: "max_amount", label: "Monto máximo por operación" },
        ],
      },
    ],
  },
  {
    title: "Política de transferencia a menores",
    rules: [{ code: "minors_transfer_policy", switchLabel: "Transferencia a menor" }],
  },
  {
    title: "Screening PLAFT (REPET)",
    rules: [
      {
        code: "plaft_screening",
        switchLabel: "Alertar coincidencias del screening",
        numbers: [{ key: "threshold", label: "Similitud mínima para alertar (%)" }],
      },
    ],
  },
  {
    title: "Exceso del perfil transaccional",
    rules: [
      {
        code: "transaction_profile_excess",
        switchLabel: "Alertar exceso de perfil",
        numbers: [{ key: "tolerance_pct", label: "Tolerancia sobre el perfil (%)" }],
      },
    ],
  },
  {
    title: "Variación del volumen mensual",
    rules: [
      {
        code: "monthly_volume_variation",
        switchLabel: "Alertar variación respecto del mes anterior",
        numbers: [
          { key: "variation_pct", label: "Aumento respecto del mes anterior (%)" },
          { key: "min_previous_amount", label: "Volumen mínimo del mes anterior para evaluar ($)" },
        ],
      },
    ],
  },
  {
    title: "Jurisdicción de alto riesgo",
    rules: [
      {
        code: "high_risk_jurisdiction",
        switchLabel: "Alertar domicilio en jurisdicción de alto riesgo",
      },
    ],
  },
  {
    title: "Operación individual superior a un monto",
    full: true,
    rules: [
      {
        code: "single_operation_amount",
        switchLabel: "Alertar operaciones que superan el monto",
        numbers: [
          {
            key: "default_amount",
            label: "Monto general por operación ($, 0 = sin monto general)",
          },
        ],
      },
    ],
  },
  {
    title: "Movimiento en horario inusual",
    full: true,
    rules: [{ code: "unusual_hours", switchLabel: "Regla de horario inusual habilitada" }],
  },
];

export const POLITICAS: { value: MinorsPolicy; label: string }[] = [
  { value: "allow", label: "Permitir" },
  { value: "alert", label: "Alertar" },
  { value: "block", label: "Bloquear" },
];

export const CODES = GROUPS.flatMap((g) => g.rules.map((r) => r.code));

export function toDraft(rules: AlertRule[]): Draft {
  const d: Draft = {};
  for (const r of rules) {
    if (!CODES.includes(r.code)) continue;
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.parameters))
      if (typeof v === "number") values[k] = String(v);
    d[r.code] = {
      isEnabled: r.isEnabled,
      values,
      conditions: structuredClone(r.conditions ?? {}),
      policy: (r.parameters.policy as MinorsPolicy | undefined) ?? undefined,
      days: Array.isArray(r.parameters.days)
        ? (r.parameters.days as ScheduleDay[]).map((x) => ({ ...x }))
        : undefined,
      jurisdictions: Array.isArray(r.parameters.jurisdictions)
        ? [...(r.parameters.jurisdictions as string[])]
        : undefined,
      byActivity: Array.isArray(r.parameters.by_activity)
        ? (r.parameters.by_activity as ActivityAmount[]).map((x) => ({
            activity: x.activity,
            amount: String(x.amount),
          }))
        : undefined,
    };
  }
  return d;
}

export function construir(draft: Draft): { rules: RuleToSave[]; errores: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rules: RuleToSave[] = [];
  for (const g of GROUPS) {
    for (const rv of g.rules) {
      const d = draft[rv.code];
      if (!d) continue;
      const parameters: Record<string, unknown> = {};
      for (const f of rv.numbers ?? []) {
        const raw = (d.values[f.key] ?? "").trim();
        const n = Number(raw);
        const id = `${rv.code}.${f.key}`;
        if (raw === "" || !Number.isFinite(n)) errors[id] = "Ingresá un número";
        else if (n < 0) errors[id] = "No puede ser negativo";
        else if (f.integer && !Number.isInteger(n)) errors[id] = "Debe ser un número entero";
        else parameters[f.key] = n;
      }
      if (
        rv.code === "abnormal_volume" &&
        typeof parameters.min_amount === "number" &&
        typeof parameters.max_amount === "number" &&
        parameters.min_amount > parameters.max_amount
      ) {
        errors["abnormal_volume.min_amount"] = "El mínimo no puede superar al máximo";
      }
      if (rv.code === "withdrawal_failed_attempts" && parameters.window_seconds === 0) {
        errors["withdrawal_failed_attempts.window_seconds"] = "Debe ser mayor a 0";
      }
      if (rv.code === "repeated_transfers" && parameters.window_minutes === 0) {
        errors["repeated_transfers.window_minutes"] = "Debe ser mayor a 0";
      }
      if (rv.code === "company_account_affinity" && parameters.window_days === 0) {
        errors["company_account_affinity.window_days"] = "Debe ser mayor a 0";
      }
      if (
        rv.code === "plaft_screening" &&
        typeof parameters.threshold === "number" &&
        parameters.threshold > 100
      ) {
        errors["plaft_screening.threshold"] = "Va de 0 a 100";
      }
      if (rv.code === "monthly_volume_variation" && parameters.variation_pct === 0) {
        errors["monthly_volume_variation.variation_pct"] = "Debe ser mayor a 0";
      }
      if (rv.code === "high_risk_jurisdiction") {
        parameters.jurisdictions = d.jurisdictions ?? [];
        if (d.isEnabled && (d.jurisdictions ?? []).length === 0) {
          errors["high_risk_jurisdiction.jurisdictions"] =
            "Elegí al menos una jurisdicción o deshabilitá la regla";
        }
      }
      if (rv.code === "single_operation_amount") {
        const vistos = new Set<string>();
        parameters.by_activity = (d.byActivity ?? []).map((row, i) => {
          const n = Number(row.amount);
          const k = normalizeValue(row.activity);
          if (!k) errors[`single_operation_amount.act${i}`] = "Indicá la actividad";
          else if (vistos.has(k)) errors[`single_operation_amount.act${i}`] = "Actividad repetida";
          else if (row.amount.trim() === "" || !Number.isFinite(n) || n < 0)
            errors[`single_operation_amount.act${i}`] = "Monto inválido";
          vistos.add(k);
          return { activity: row.activity.trim(), amount: n };
        });
      }
      if (rv.code === "minors_transfer_policy") parameters.policy = d.policy ?? "block";
      if (rv.code === "unusual_hours") {
        parameters.days = d.days ?? [];
        (d.days ?? []).forEach((day) => {
          if (day.enabled && day.start >= day.end)
            errors[`unusual_hours.day${day.day}`] = "El inicio debe ser anterior al fin";
        });
      }
      rules.push({ code: rv.code, isEnabled: d.isEnabled, parameters, conditions: d.conditions });
    }
  }
  return { rules, errores: errors };
}
