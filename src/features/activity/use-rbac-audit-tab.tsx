import { useMemo,useState } from "react";
import { Badge } from "@/shared/ui/badge";
import type { RbacAuditEntry,RbacAuditFilters } from "./activity.types";
import { useRbacAudit } from "./activity.hooks";
import { type ActivityColumn } from "./activity-ui";
import { formatDateTime } from "@/shared/lib/format";
import {
EMPTY_FILTERS,
actorLabel,
describe,
changedFields,
} from "@/features/activity/rbac-audit-tab.rules";

/** Estado y acciones de RbacAuditTab: el componente solo dibuja. */
export function useRbacAuditTab() {
  const [filters, setFilters] = useState<RbacAuditFilters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<RbacAuditEntry | null>(null);

  const query = useRbacAudit(filters);
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);

  const update = (patch: Partial<RbacAuditFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);

  const columns: ActivityColumn<RbacAuditEntry>[] = [
    {
      key: "createdAt",
      label: "Fecha y hora",
      className: "whitespace-nowrap",
      render: (e) => (
        <span className="font-mono text-xs tabular-nums">
          {formatDateTime(e.createdAt, { seconds: true })}
        </span>
      ),
    },
    {
      key: "actor",
      label: "Quién",
      render: (e) => (
        <div className="max-w-56">
          <div className="truncate">{actorLabel(e)}</div>
          {e.actorName && e.actorEmail && (
            <div className="truncate text-[11px] text-muted-foreground">{e.actorEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: "action",
      label: "Cambio",
      className: "whitespace-nowrap",
      render: (e) => {
        const d = describe(e);
        return <Badge tone={d.tone}>{d.action}</Badge>;
      },
    },
    {
      key: "subject",
      label: "Detalle",
      render: (e) => <div className="line-clamp-2 max-w-xl">{describe(e).subject}</div>,
    },
  ];

  const detailDescription = detail ? describe(detail) : null;
  const detailFields = detail ? changedFields(detail) : [];
  const isPermissionSet = detail?.event === "role.permissions_set";
  return {
    filters,
    setFilters,
    detail,
    setDetail,
    query,
    rows,
    update,
    hasFilters,
    columns,
    detailDescription,
    detailFields,
    isPermissionSet,
  };
}

export type RbacAuditTabVm = ReturnType<typeof useRbacAuditTab>;
