import { FormDialog } from "@/shared/ui/form-dialog";
import { formatMoney,formatDateTime } from "@/shared/lib/format";
import { STATUS_LABEL,COMPLIANCE_LABEL } from "@/features/alerts/blocks-table.rules";
import { Field } from "@/features/alerts/components/alerts-table-parts";
import type { BlocksTableVm } from "./use-blocks-table";

export function BlockDetailDialog({
  detail,
  setDetail,
}: Pick<BlocksTableVm, "detail" | "setDetail">) {
  return (
    <>
      {detail && (
        <FormDialog
          open
          onClose={() => setDetail(null)}
          title="Detalle del bloqueo"
          description={`${detail.legajo} · ${detail.nombre}`}
          onSubmit={() => setDetail(null)}
          submitLabel="Cerrar"
          size="lg"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Cliente" value={`${detail.nombre} · ${detail.correo}`} />
            <Field
              label="Origen"
              value={detail.origin === "rule" ? `Regla: ${detail.ruleName ?? "—"}` : "Manual"}
            />
            <Field
              label="Alcance"
              value={
                detail.scope === "client"
                  ? "Toda la cuenta"
                  : `Subcuenta ${detail.subcuentaNombre ?? ""} ${detail.subcuentaCvu ?? ""}`
              }
            />
            <Field
              label="Estado"
              value={`${STATUS_LABEL[detail.blockStatus]} · Compliance ${COMPLIANCE_LABEL[detail.complianceStatus].toLowerCase()}`}
            />
            <Field
              label="Bloqueado"
              value={`${formatDateTime(detail.blockedAt)} · ${detail.blockedByName ?? "Sistema"}`}
            />
            <Field
              label="Aceptado"
              value={
                detail.acceptedAt
                  ? `${formatDateTime(detail.acceptedAt)} · ${detail.acceptedByName ?? "—"}`
                  : "—"
              }
            />
            <Field
              label="Liberado"
              value={
                detail.releasedAt
                  ? `${formatDateTime(detail.releasedAt)} · ${detail.releasedByName ?? "—"}`
                  : "—"
              }
            />
            <Field label="Fondos retenidos" value={formatMoney(detail.heldAmount)} />
            <Field label="Motivo" value={detail.reason} full />
            {detail.releaseNotes && (
              <Field label="Motivo de liberación" value={detail.releaseNotes} full />
            )}
            {detail.idTxn && <Field label="Operación (TXID)" value={detail.idTxn} mono />}
          </div>
        </FormDialog>
      )}
    </>
  );
}
