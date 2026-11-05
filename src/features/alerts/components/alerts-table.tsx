import { ErrorNotice } from "@/shared/ui/error-notice";
import { useAlertsTable } from "@/features/alerts/components/use-alerts-table";
import { AlertsListBody } from "@/features/alerts/components/alerts-list-body";
import { AlertDetailDialog } from "@/features/alerts/components/alert-detail-dialog";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ALERT_RESOLUTION_LABEL } from "@/features/regulatory-reports/compliance.supabase";

/**
 * Listado y gestión de alertas (aceptar, asignar, comentar, cerrar).
 * Con `legajo` muestra solo las de ese cliente y oculta sus columnas (ficha).
 */
export function AlertsTable(props: { legajo?: string }) {
  const vm = useAlertsTable(props);
  const { ruling, setRuling, notes, setNotes, sending, confirmRuling } = vm;

  return (
    <>
      <AlertsListBody {...vm} />

      <AlertDetailDialog {...vm} />

      {ruling && (
        <FormDialog
          open
          onClose={() => setRuling(null)}
          title={ALERT_RESOLUTION_LABEL[ruling.resolution]}
          description={`${ruling.alert.type} · ${ruling.alert.legajo}`}
          onSubmit={() => void confirmRuling()}
          submitLabel={sending ? "Guardando…" : "Confirmar resolución"}
        >
          {ruling.resolution === "ros" && (
            <ErrorNotice className="mb-3" icon={false}>
              Registra que la operatoria no tiene justificación económica ni legal y corresponde un
              Reporte de Operación Sospechosa ante la UIF.
            </ErrorNotice>
          )}
          {ruling.resolution === "false_positive" && ruling.alert.plaftMatchId != null && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Esta coincidencia REPET queda descartada y no vuelve a generar alertas. Otras
              coincidencias del cliente sí.
            </div>
          )}
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Dictamen del analista
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fundamento de la resolución, documentación revisada…"
            className="w-full h-28 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Cerrar la alerta no desbloquea la cuenta: los bloqueos se liberan desde el listado de
            bloqueos.
          </p>
        </FormDialog>
      )}
    </>
  );
}
