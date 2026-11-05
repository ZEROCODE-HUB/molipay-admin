import { Badge } from "@/shared/ui/badge";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { DetailRow,JsonBlock } from "./activity-ui";
import { formatDateTime } from "@/shared/lib/format";
import {
CATEGORY_LABELS,
OUTCOME,
SEVERITY,
actorLabel,
ACTOR_TYPE_LABELS,
} from "@/features/activity/security-events-tab.rules";
import type { SecurityEventsTabVm } from "./use-security-events-tab";

export function SecurityEventDetailModal({
  detail,
  setDetail,
}: Pick<SecurityEventsTabVm, "detail" | "setDetail">) {
  return (
    <>
      {detail && (
        <ModalDialog
          open
          onClose={() => setDetail(null)}
          title={detail.label}
          description={`${detail.action} · #${detail.id}`}
          size="lg"
        >
          <DetailRow label="Fecha y hora">
            {formatDateTime(detail.occurredAt, { seconds: true })}
          </DetailRow>
          <DetailRow label="Categoría">{CATEGORY_LABELS[detail.category]}</DetailRow>
          <DetailRow label="Resultado">
            <Badge tone={OUTCOME[detail.outcome].tone}>{OUTCOME[detail.outcome].label}</Badge>
          </DetailRow>
          <DetailRow label="Severidad">
            <Badge tone={SEVERITY[detail.severity].tone}>{SEVERITY[detail.severity].label}</Badge>
          </DetailRow>
          <DetailRow label="Actor">
            {actorLabel(detail)} · {ACTOR_TYPE_LABELS[detail.actorType]}
            {detail.actorId && (
              <div className="font-mono text-[11px] text-muted-foreground">{detail.actorId}</div>
            )}
          </DetailRow>
          <DetailRow label="Afectado">
            {detail.targetEmail ?? "—"}
            {detail.targetType && (
              <div className="font-mono text-[11px] text-muted-foreground">
                {detail.targetType} {detail.targetId}
              </div>
            )}
          </DetailRow>
          {detail.tenantId && (
            <DetailRow label="Comercio">
              <span className="font-mono text-xs">{detail.tenantId}</span>
            </DetailRow>
          )}
          <DetailRow label="IP">{detail.ip}</DetailRow>
          <DetailRow label="Navegador">
            {detail.userAgent && <span className="text-xs">{detail.userAgent}</span>}
          </DetailRow>
          <DetailRow label="Origen">
            <span className="font-mono text-xs">{detail.source}</span>
          </DetailRow>
          {detail.requestId && (
            <DetailRow label="Request id">
              <span className="font-mono text-xs">{detail.requestId}</span>
            </DetailRow>
          )}
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Datos adicionales
            </div>
            <JsonBlock value={detail.metadata} />
          </div>
        </ModalDialog>
      )}
    </>
  );
}
