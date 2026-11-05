import { type MinorsPolicy } from "@/features/alerts/alert-rules.supabase";
import { Filter,Plus,Trash2 } from "lucide-react";
import { ChipsSelect,PROVINCIAS_AR,unirValues } from "@/features/alerts/components/chips-select";
import { summaryCondiciones } from "@/features/alerts/components/rule-conditions";
import { GROUPS,POLITICAS,dayNames } from "@/features/alerts/alert-settings.rules";
import { ErrorField,Toggle } from "./alert-settings-parts";

import type { AlertSettingsPageVm } from "./use-alert-settings-page";

export function AlertRulesPanel({
  draft,
  patch,
  errors,
  fichaValues,
  setCondicionesDe,
}: Pick<AlertSettingsPageVm, "draft" | "patch" | "errors" | "fichaValues" | "setCondicionesDe">) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {GROUPS.map((g) => (
        <div
          key={g.title}
          className={
            g.full ? "break-inside-avoid md:col-span-2 lg:col-span-full" : "break-inside-avoid"
          }
        >
          <h4 className="font-display text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
            {g.title}
          </h4>
          <div className="space-y-3">
            {g.rules.map((rv) => {
              const d = draft[rv.code];
              if (!d) return null;
              return (
                <div key={rv.code} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{rv.switchLabel}</span>
                    <Toggle
                      label={rv.switchLabel}
                      enabled={d.isEnabled}
                      onClick={() =>
                        patch(rv.code, (x) => {
                          x.isEnabled = !x.isEnabled;
                        })
                      }
                    />
                  </div>

                  {rv.numbers?.map((f) => {
                    const id = `${rv.code}.${f.key}`;
                    return (
                      <div key={id}>
                        <label
                          htmlFor={id}
                          className="block text-xs font-semibold text-muted-foreground mb-1"
                        >
                          {f.label}
                        </label>
                        <input
                          id={id}
                          type="number"
                          min={0}
                          step={f.integer ? 1 : "any"}
                          value={d.values[f.key] ?? ""}
                          onChange={(e) =>
                            patch(rv.code, (x) => {
                              x.values[f.key] = e.target.value;
                            })
                          }
                          aria-invalid={Boolean(errors[id])}
                          className={`w-full h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${errors[id] ? "border-red-400" : "border-input"}`}
                        />
                        <ErrorField msg={errors[id]} />
                      </div>
                    );
                  })}

                  {rv.code === "high_risk_jurisdiction" && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        Jurisdicciones de alto riesgo
                      </div>
                      <ChipsSelect
                        value={d.jurisdictions ?? []}
                        onChange={(v) =>
                          patch(rv.code, (x) => {
                            x.jurisdictions = v;
                          })
                        }
                        options={unirValues(PROVINCIAS_AR, fichaValues.provincias).map((v) => ({
                          value: v,
                        }))}
                        placeholder="Buscar o escribir una jurisdicción…"
                        allowCustom
                        emptyLabel="Ninguna"
                      />
                      <ErrorField msg={errors["high_risk_jurisdiction.jurisdictions"]} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Se compara con la provincia del domicilio. "Ejecutar barrido" en el listado
                        alerta a toda la cartera.
                      </p>
                    </div>
                  )}

                  {rv.code === "single_operation_amount" && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Montos por actividad económica (reemplazan al general)
                      </div>
                      {(d.byActivity ?? []).map((row, i) => (
                        <div key={i}>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              list="actividades-ficha"
                              value={row.activity}
                              onChange={(e) =>
                                patch(rv.code, (x) => {
                                  x.byActivity![i].activity = e.target.value;
                                })
                              }
                              placeholder="Actividad"
                              className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                            />
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.amount}
                              onChange={(e) =>
                                patch(rv.code, (x) => {
                                  x.byActivity![i].amount = e.target.value;
                                })
                              }
                              placeholder="Monto ($)"
                              className="w-44 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                            />
                            <button
                              type="button"
                              aria-label="Quitar actividad"
                              onClick={() =>
                                patch(rv.code, (x) => {
                                  x.byActivity!.splice(i, 1);
                                })
                              }
                              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <ErrorField msg={errors[`single_operation_amount.act${i}`]} />
                        </div>
                      ))}
                      <datalist id="actividades-ficha">
                        {fichaValues.actividades.map((a) => (
                          <option key={a} value={a} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() =>
                          patch(rv.code, (x) => {
                            x.byActivity = [...(x.byActivity ?? []), { activity: "", amount: "" }];
                          })
                        }
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-input text-xs hover:bg-accent"
                      >
                        <Plus size={12} /> Agregar actividad
                      </button>
                    </div>
                  )}

                  {rv.code === "minors_transfer_policy" && (
                    <div>
                      <label
                        htmlFor="politica-menores"
                        className="block text-xs font-semibold text-muted-foreground mb-1"
                      >
                        Política
                      </label>
                      <select
                        id="politica-menores"
                        value={d.policy ?? "block"}
                        onChange={(e) =>
                          patch(rv.code, (x) => {
                            x.policy = e.target.value as MinorsPolicy;
                          })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {POLITICAS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {rv.code === "unusual_hours" &&
                    (d.days ?? []).map((day, i) => (
                      <div key={day.day}>
                        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-foreground w-24">
                              {dayNames[day.day - 1]}
                            </span>
                            <Toggle
                              label={dayNames[day.day - 1]}
                              enabled={day.enabled}
                              onClick={() =>
                                patch(rv.code, (x) => {
                                  x.days![i].enabled = !x.days![i].enabled;
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-semibold text-muted-foreground">
                              Inicio
                            </label>
                            <input
                              type="time"
                              value={day.start}
                              disabled={!day.enabled}
                              onChange={(e) =>
                                patch(rv.code, (x) => {
                                  x.days![i].start = e.target.value;
                                })
                              }
                              className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">→</span>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-semibold text-muted-foreground">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={day.end}
                              disabled={!day.enabled}
                              onChange={(e) =>
                                patch(rv.code, (x) => {
                                  x.days![i].end = e.target.value;
                                })
                              }
                              className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                            />
                          </div>
                        </div>
                        <ErrorField msg={errors[`unusual_hours.day${day.day}`]} />
                      </div>
                    ))}

                  <button
                    type="button"
                    onClick={() => setCondicionesDe({ code: rv.code, name: g.title })}
                    className="flex w-full items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
                    title="Limitar la regla a clientes con ciertos datos de ficha"
                  >
                    <Filter size={12} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">Aplica a:</span>{" "}
                      {summaryCondiciones(d.conditions)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
