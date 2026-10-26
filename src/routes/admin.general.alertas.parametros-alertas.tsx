import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Info, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import {
  listAlertRules,
  saveAlertRules,
  type AlertRule,
  type AlertRuleCode,
  type MinorsPolicy,
  type ScheduleDay,
} from "@/lib/api/alert-rules";

export const Route = createFileRoute("/admin/general/alertas/parametros-alertas")({
  head: () => ({ meta: [{ title: "Parámetros de alertas — Admin Panel" }] }),
  component: Page,
});

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type NumberField = { key: string; label: string; integer?: boolean };

/**
 * Presentacion de cada regla: titulo del grupo, etiqueta del switch y campos.
 * Los VALORES salen de la base (alert_rules); aca solo vive como se muestran.
 */
type RuleView = { code: AlertRuleCode; switchLabel: string; numbers?: NumberField[] };
type GroupView = { title: string; rules: RuleView[]; full?: boolean };

const GROUPS: GroupView[] = [
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
          { key: "min_wage_deposits_per_transfer", label: "Depósitos de salario mínimo por transferencia", integer: true },
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
          { key: "window_seconds", label: "Tiempo de evaluación de retiros fallidos (segundos)", integer: true },
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
          { key: "threshold", label: "Umbral de operaciones repetidas (mismo destino)", integer: true },
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
        numbers: [{ key: "max_per_hour", label: "Transferencias por hora (máximo)", integer: true }],
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
    title: "Movimiento en horario inusual",
    full: true,
    rules: [{ code: "unusual_hours", switchLabel: "Regla de horario inusual habilitada" }],
  },
];

const POLITICAS: { value: MinorsPolicy; label: string }[] = [
  { value: "allow", label: "Permitir" },
  { value: "alert", label: "Alertar" },
  { value: "block", label: "Bloquear" },
];

const CODES = GROUPS.flatMap((g) => g.rules.map((r) => r.code));

/** Estado editable: numeros como texto para no perder lo que se esta tipeando. */
type Draft = Record<string, { isEnabled: boolean; values: Record<string, string>; policy?: MinorsPolicy; days?: ScheduleDay[] }>;

function toDraft(rules: AlertRule[]): Draft {
  const d: Draft = {};
  for (const r of rules) {
    if (!CODES.includes(r.code)) continue;
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.parameters)) if (typeof v === "number") values[k] = String(v);
    d[r.code] = {
      isEnabled: r.isEnabled,
      values,
      policy: (r.parameters.policy as MinorsPolicy | undefined) ?? undefined,
      days: Array.isArray(r.parameters.days) ? (r.parameters.days as ScheduleDay[]).map((x) => ({ ...x })) : undefined,
    };
  }
  return d;
}

/** Valida y arma los parametros a guardar; devuelve errores por campo. */
function construir(draft: Draft): { rules: { code: AlertRuleCode; isEnabled: boolean; parameters: Record<string, unknown> }[]; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const rules: { code: AlertRuleCode; isEnabled: boolean; parameters: Record<string, unknown> }[] = [];
  for (const g of GROUPS) {
    for (const rv of g.rules) {
      const d = draft[rv.code];
      if (!d) continue;
      const parameters: Record<string, unknown> = {};
      for (const f of rv.numbers ?? []) {
        const raw = (d.values[f.key] ?? "").trim();
        const n = Number(raw);
        const id = `${rv.code}.${f.key}`;
        if (raw === "" || !Number.isFinite(n)) errores[id] = "Ingresá un número";
        else if (n < 0) errores[id] = "No puede ser negativo";
        else if (f.integer && !Number.isInteger(n)) errores[id] = "Debe ser un número entero";
        else parameters[f.key] = n;
      }
      if (rv.code === "abnormal_volume" && typeof parameters.min_amount === "number" && typeof parameters.max_amount === "number"
          && parameters.min_amount > parameters.max_amount) {
        errores["abnormal_volume.min_amount"] = "El mínimo no puede superar al máximo";
      }
      if (rv.code === "withdrawal_failed_attempts" && parameters.window_seconds === 0) {
        errores["withdrawal_failed_attempts.window_seconds"] = "Debe ser mayor a 0";
      }
      if (rv.code === "repeated_transfers" && parameters.window_minutes === 0) {
        errores["repeated_transfers.window_minutes"] = "Debe ser mayor a 0";
      }
      if (rv.code === "company_account_affinity" && parameters.window_days === 0) {
        errores["company_account_affinity.window_days"] = "Debe ser mayor a 0";
      }
      if (rv.code === "plaft_screening" && typeof parameters.threshold === "number" && parameters.threshold > 100) {
        errores["plaft_screening.threshold"] = "Va de 0 a 100";
      }
      if (rv.code === "minors_transfer_policy") parameters.policy = d.policy ?? "block";
      if (rv.code === "unusual_hours") {
        parameters.days = d.days ?? [];
        (d.days ?? []).forEach((day) => {
          if (day.enabled && day.start >= day.end) errores[`unusual_hours.day${day.day}`] = "El inicio debe ser anterior al fin";
        });
      }
      rules.push({ code: rv.code, isEnabled: d.isEnabled, parameters });
    }
  }
  return { rules, errores };
}

function Toggle({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
        enabled ? "bg-moli-blue" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const ErrorCampo = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-[11px] font-medium text-red-600">{msg}</p> : null;

function Page() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["alert_rules"],
    queryFn: listAlertRules,
  });

  const [draft, setDraft] = useState<Draft>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const original = useMemo(() => (rules ? toDraft(rules) : null), [rules]);
  useEffect(() => {
    if (original) setDraft(structuredClone(original));
  }, [original]);

  const sinCambios = useMemo(() => JSON.stringify(original) === JSON.stringify(draft), [original, draft]);
  const faltantes = original ? CODES.filter((c) => !original[c]) : [];

  const patch = (code: string, fn: (d: Draft[string]) => void) =>
    setDraft((prev) => {
      const next = structuredClone(prev);
      if (next[code]) fn(next[code]);
      return next;
    });

  const guardar = async () => {
    const { rules: aGuardar, errores: errs } = construir(draft);
    setErrores(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Revisá los campos marcados antes de guardar");
      return;
    }
    setGuardando(true);
    try {
      await saveAlertRules(aGuardar);
      await queryClient.invalidateQueries({ queryKey: ["alert_rules"] });
      toast.success("Configuración de alertas guardada");
    } catch (e) {
      toast.error(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Parámetros de alertas"
        description="Configuración de umbrales que activan alertas (solo notifican, no bloquean)"
      />

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex gap-3">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          Una <strong>alerta</strong> solo notifica y queda pendiente de revisión manual. No
          suspende la cuenta automáticamente.
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" /> Cargando configuración…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
          <AlertTriangle size={24} />
          <p>No se pudo cargar la configuración: {(error as Error)?.message}</p>
          <button type="button" onClick={() => refetch()} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-4 md:p-6">
          {faltantes.length > 0 && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Faltan reglas en la base ({faltantes.join(", ")}). Aplicá la migración de configuración de alertas.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {GROUPS.map((g) => (
              <div key={g.title} className={g.full ? "break-inside-avoid md:col-span-2 lg:col-span-full" : "break-inside-avoid"}>
                <h4 className="font-display text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">{g.title}</h4>
                <div className="space-y-3">
                  {g.rules.map((rv) => {
                    const d = draft[rv.code];
                    if (!d) return null;
                    return (
                      <div key={rv.code} className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{rv.switchLabel}</span>
                          <Toggle label={rv.switchLabel} enabled={d.isEnabled} onClick={() => patch(rv.code, (x) => { x.isEnabled = !x.isEnabled; })} />
                        </div>

                        {rv.numbers?.map((f) => {
                          const id = `${rv.code}.${f.key}`;
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</label>
                              <input
                                id={id}
                                type="number"
                                min={0}
                                step={f.integer ? 1 : "any"}
                                value={d.values[f.key] ?? ""}
                                onChange={(e) => patch(rv.code, (x) => { x.values[f.key] = e.target.value; })}
                                aria-invalid={Boolean(errores[id])}
                                className={`w-full h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${errores[id] ? "border-red-400" : "border-input"}`}
                              />
                              <ErrorCampo msg={errores[id]} />
                            </div>
                          );
                        })}

                        {rv.code === "minors_transfer_policy" && (
                          <div>
                            <label htmlFor="politica-menores" className="block text-xs font-semibold text-muted-foreground mb-1">Política</label>
                            <select
                              id="politica-menores"
                              value={d.policy ?? "block"}
                              onChange={(e) => patch(rv.code, (x) => { x.policy = e.target.value as MinorsPolicy; })}
                              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                            >
                              {POLITICAS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          </div>
                        )}

                        {rv.code === "unusual_hours" && (d.days ?? []).map((day, i) => (
                          <div key={day.day}>
                            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-foreground w-24">{dayNames[day.day - 1]}</span>
                                <Toggle label={dayNames[day.day - 1]} enabled={day.enabled} onClick={() => patch(rv.code, (x) => { x.days![i].enabled = !x.days![i].enabled; })} />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-semibold text-muted-foreground">Inicio</label>
                                <input
                                  type="time"
                                  value={day.start}
                                  disabled={!day.enabled}
                                  onChange={(e) => patch(rv.code, (x) => { x.days![i].start = e.target.value; })}
                                  className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">→</span>
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-semibold text-muted-foreground">Fin</label>
                                <input
                                  type="time"
                                  value={day.end}
                                  disabled={!day.enabled}
                                  onChange={(e) => patch(rv.code, (x) => { x.days![i].end = e.target.value; })}
                                  className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                                />
                              </div>
                            </div>
                            <ErrorCampo msg={errores[`unusual_hours.day${day.day}`]} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-border">
            {!sinCambios && <span className="text-xs text-muted-foreground">Hay cambios sin guardar</span>}
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={guardando || sinCambios}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {guardando ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
