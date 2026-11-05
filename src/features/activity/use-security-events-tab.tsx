import { useMemo,useState } from "react";
import { Badge } from "@/shared/ui/badge";
import type { SecurityEvent,SecurityEventFilters } from "./activity.types";
import { useSecurityEventTypes,useSecurityEvents } from "./activity.hooks";
import { type ActivityColumn } from "./activity-ui";
import { formatDateTime } from "@/shared/lib/format";
import {
EMPTY_FILTERS,
OUTCOME,
SEVERITY,
actorLabel,
ACTOR_TYPE_LABELS,
targetLabel,
} from "@/features/activity/security-events-tab.rules";

/** Estado y acciones de SecurityEventsTab: el componente solo dibuja. */
export function useSecurityEventsTab() {
  const [filters, setFilters] = useState<SecurityEventFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [detail, setDetail] = useState<SecurityEvent | null>(null);

  const typesQuery = useSecurityEventTypes();

  const query = useSecurityEvents(filters);
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);

  const actionOptions = useMemo(
    () =>
      (typesQuery.data ?? []).filter(
        (t) => t.isEnabled && (!filters.category || t.category === filters.category),
      ),
    [typesQuery.data, filters.category],
  );

  const update = (patch: Partial<SecurityEventFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);

  const columns: ActivityColumn<SecurityEvent>[] = [
    {
      key: "occurredAt",
      label: "Fecha y hora",
      className: "whitespace-nowrap",
      render: (e) => (
        <span className="font-mono text-xs tabular-nums">
          {formatDateTime(e.occurredAt, { seconds: true })}
        </span>
      ),
    },
    {
      key: "event",
      label: "Evento",
      render: (e) => (
        <div>
          <div className="font-medium">{e.label}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{e.action}</div>
        </div>
      ),
    },
    {
      key: "outcome",
      label: "Resultado",
      render: (e) => <Badge tone={OUTCOME[e.outcome].tone}>{OUTCOME[e.outcome].label}</Badge>,
    },
    {
      key: "severity",
      label: "Severidad",
      render: (e) => <Badge tone={SEVERITY[e.severity].tone}>{SEVERITY[e.severity].label}</Badge>,
    },
    {
      key: "actor",
      label: "Actor",
      render: (e) => (
        <div className="max-w-56">
          <div className="truncate">{actorLabel(e)}</div>
          {e.actorEmail && (
            <div className="text-[11px] text-muted-foreground">
              {ACTOR_TYPE_LABELS[e.actorType]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "target",
      label: "Afectado",
      render: (e) => <div className="max-w-56 truncate">{targetLabel(e)}</div>,
    },
    {
      key: "ip",
      label: "IP",
      render: (e) => <span className="font-mono text-xs">{e.ip ?? "—"}</span>,
    },
    {
      key: "source",
      label: "Origen",
      render: (e) => (
        <span className="font-mono text-[11px] text-muted-foreground">{e.source}</span>
      ),
    },
  ];
  return {
    filters,
    setFilters,
    searchDraft,
    setSearchDraft,
    detail,
    setDetail,
    query,
    rows,
    actionOptions,
    update,
    hasFilters,
    columns,
  };
}

export type SecurityEventsTabVm = ReturnType<typeof useSecurityEventsTab>;
