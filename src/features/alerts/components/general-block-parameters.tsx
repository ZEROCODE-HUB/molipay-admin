import { ErrorNotice } from "@/shared/ui/error-notice";
import { userMessage } from "@/shared/lib/errors";
import { Loader2,Save } from "lucide-react";

import type { BlockSettingsPageVm } from "./use-block-settings-page";

export function GeneralBlockParameters({
  rules,
  rule,
  params,
  setParams,
  errGen,
  saveGenerales,
  savingGen,
  genWithoutChanges,
}: Pick<
  BlockSettingsPageVm,
  | "rules"
  | "rule"
  | "params"
  | "setParams"
  | "errGen"
  | "saveGenerales"
  | "savingGen"
  | "genWithoutChanges"
>) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
        Parámetros generales de bloqueos
      </h3>
      {rules.isLoading ? (
        <div className="flex items-center text-sm text-muted-foreground py-4">
          <Loader2 size={14} className="animate-spin mr-2" /> Cargando…
        </div>
      ) : rules.isError || !rule ? (
        <ErrorNotice>
          {rules.isError
            ? `No se pudo cargar: ${userMessage(rules.error)}`
            : "Falta la regla de bloqueo en la base: aplicá la migración de configuración de alertas."}
        </ErrorNotice>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(
              [
                [
                  "persona",
                  "Cantidad de salarios mínimos depositados por persona",
                  "Si una persona física supera este acumulado de depósitos, la cuenta se bloquea automáticamente.",
                ],
                [
                  "empresa",
                  "Cantidad de salarios mínimos depositados por empresa",
                  "Si una persona jurídica supera este acumulado de depósitos, la cuenta se bloquea automáticamente.",
                ],
              ] as const
            ).map(([k, label, help]) => (
              <div key={k}>
                <label
                  htmlFor={`gen-${k}`}
                  className="block text-xs font-semibold text-muted-foreground mb-1"
                >
                  {label}
                </label>
                <input
                  id={`gen-${k}`}
                  type="number"
                  min={0}
                  step={1}
                  value={params[k]}
                  onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))}
                  aria-invalid={Boolean(errGen[k])}
                  className={`w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${errGen[k] ? "border-red-400" : "border-input"}`}
                />
                {errGen[k] ? (
                  <p className="text-[11px] font-medium text-red-600 mt-1">{errGen[k]}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">{help}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void saveGenerales()}
              disabled={savingGen || genWithoutChanges}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {savingGen ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingGen ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
