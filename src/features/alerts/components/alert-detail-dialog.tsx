import { CheckCircle,XCircle,FileWarning,ShieldCheck } from "lucide-react";
import { FormDialog } from "@/shared/ui/form-dialog";
import { BtnOutline } from "@/shared/ui/button";
import { AlertGestionPanel } from "@/features/alerts/components/alert-management-panel";
import {
ALERT_RESOLUTION_LABEL,
ALERT_STATUS_LABEL,
} from "@/features/regulatory-reports/compliance.supabase";
import { formatMoney,formatDateTime } from "@/shared/lib/format";
import { Field } from "@/features/alerts/components/alerts-table-parts";
import { fmtDay,WITHOUT_ASSIGN } from "@/features/alerts/alerts-table.rules";
import type { AlertsTableVm } from "./use-alerts-table";

export function AlertDetailDialog({
  detailVivo,
  setDetail,
  aceptar,
  openRuling,
  refresh,
}: Pick<AlertsTableVm, "detailVivo" | "setDetail" | "aceptar" | "openRuling" | "refresh">) {
  return (
    <>
      {detailVivo && (
        <FormDialog
          open
          onClose={() => setDetail(null)}
          title="Detalle de alerta"
          description={detailVivo.type}
          onSubmit={() => setDetail(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Legajo" value={detailVivo.legajo} mono />
            <Field label="Cliente" value={`${detailVivo.nombre} · ${detailVivo.correo}`} />
            <Field label="Estado" value={ALERT_STATUS_LABEL[detailVivo.status]} />
            <Field label="Regla" value={detailVivo.ruleCode ?? "—"} mono />
            <Field label="Fecha de alerta" value={formatDateTime(detailVivo.createdAt)} />
            <Field
              label="Vencimiento (90 días corridos)"
              value={`${fmtDay(detailVivo.dueAt)}${detailVivo.isOverdue ? " · VENCIDA" : ""}`}
            />
            <Field
              label="Analista responsable"
              value={detailVivo.assignedToName ?? WITHOUT_ASSIGN}
            />
            <Field
              label="Ficha"
              value={`${detailVivo.actividad ?? "Sin actividad"} · ${detailVivo.provincia ?? "Sin provincia"}`}
            />
            <Field
              label="Aceptada"
              value={
                detailVivo.acceptedAt
                  ? `${formatDateTime(detailVivo.acceptedAt)} · ${detailVivo.acceptedByName ?? "—"}`
                  : "—"
              }
            />
            <Field
              label="Cerrada"
              value={
                detailVivo.resolvedAt
                  ? `${formatDateTime(detailVivo.resolvedAt)} · ${detailVivo.resolvedByName ?? "—"}`
                  : "—"
              }
            />
            {detailVivo.resolution && (
              <Field
                label="Resultado final"
                value={ALERT_RESOLUTION_LABEL[detailVivo.resolution]}
              />
            )}
            {detailVivo.resolutionNotes && (
              <Field label="Dictamen" value={detailVivo.resolutionNotes} full />
            )}
            <Field label="Motivo" value={detailVivo.description} full />
            {detailVivo.idTxn && (
              <>
                <Field label="Operación (TXID)" value={detailVivo.idTxn} mono />
                <Field
                  label="Monto / tipo"
                  value={`${formatMoney(detailVivo.montoOperacion)} · ${detailVivo.tipoOperacion ?? "—"}`}
                />
              </>
            )}
            {detailVivo.plaftMatchId != null && (
              <Field label="Coincidencia PLAFT" value={`#${detailVivo.plaftMatchId}`} mono />
            )}
            {Object.keys(detailVivo.details).length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Datos del evento</div>
                <pre className="rounded-md bg-muted/50 p-3 text-xs overflow-x-auto">
                  {JSON.stringify(detailVivo.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
          {detailVivo.isActive && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {detailVivo.status === "pending" && (
                <BtnOutline onClick={() => void aceptar(detailVivo)}>
                  <CheckCircle size={14} /> Aceptar
                </BtnOutline>
              )}
              <BtnOutline onClick={() => openRuling(detailVivo, "justified")}>
                <ShieldCheck size={14} /> Justificada
              </BtnOutline>
              <BtnOutline onClick={() => openRuling(detailVivo, "ros")}>
                <FileWarning size={14} /> ROS
              </BtnOutline>
              <BtnOutline onClick={() => openRuling(detailVivo, "false_positive")}>
                <XCircle size={14} /> Falso positivo
              </BtnOutline>
            </div>
          )}
          <AlertGestionPanel
            key={detailVivo.id}
            alert={detailVivo}
            onChanged={() => void refresh()}
          />
        </FormDialog>
      )}
    </>
  );
}
