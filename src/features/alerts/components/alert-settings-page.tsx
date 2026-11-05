import { StatusMessage } from "@/shared/ui/status-message";
import { ErrorNotice } from "@/shared/ui/error-notice";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { AlertRulesPanel } from "./alert-rules-panel";
import { useAlertSettingsPage } from "./use-alert-settings-page";
import { userMessage } from "@/shared/lib/errors";
import { PageHeader } from "@/shared/ui/page-header";
import { Info,Loader2,Save } from "lucide-react";
import { RuleConditionsDialog } from "@/features/alerts/components/rule-conditions";
import { ProfilesTransaccionalesCard } from "@/features/alerts/components/transaction-profiles-card";

export function AlertSettingsPage() {
  const vm = useAlertSettingsPage();
  const {
    isLoading,
    isError,
    error,
    refetch,
    fichaValues,
    condicionesDe,
    setCondicionesDe,
    draft,
    saving,
    withoutChanges,
    faltantes,
    patch,
    save,
  } = vm;

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
          suspende la cuenta automáticamente. Cada regla puede limitarse a ciertos clientes según su
          ficha (tipo de persona, estado, actividad, provincia, riesgo, PEP) con{" "}
          <strong>Aplica a</strong>. Los cambios rigen desde la próxima operación.
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Cargando configuración…" />
      ) : isError ? (
        <StatusMessage
          kind="error"
          errorTitle="No se pudo cargar la configuración"
          message={userMessage(error)}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="bg-card border rounded-lg p-4 md:p-6">
          {faltantes.length > 0 && (
            <ErrorNotice className="mb-4" icon={false}>
              Faltan reglas en la base ({faltantes.join(", ")}). Aplicá la migración de
              configuración de alertas.
            </ErrorNotice>
          )}
          <AlertRulesPanel {...vm} />

          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-border">
            {!withoutChanges && (
              <span className="text-xs text-muted-foreground">Hay cambios sin guardar</span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || withoutChanges}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}

      {condicionesDe && draft[condicionesDe.code] && (
        <RuleConditionsDialog
          open
          ruleName={condicionesDe.name}
          value={draft[condicionesDe.code].conditions}
          fichaValues={fichaValues}
          onClose={() => setCondicionesDe(null)}
          onApply={(c) =>
            patch(condicionesDe.code, (x) => {
              x.conditions = c;
            })
          }
        />
      )}

      <ProfilesTransaccionalesCard />
    </>
  );
}
