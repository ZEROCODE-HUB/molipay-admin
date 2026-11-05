import { useRbacAuditTab } from "@/features/activity/use-rbac-audit-tab";
import { ActivityTable,DetailRow,FilterField,JsonBlock } from "@/features/activity/activity-ui";
import { SELECT_CLASS } from "@/features/activity/activity-styles";
import { type RbacAuditTable } from "@/features/activity/activity.types";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline } from "@/shared/ui/button";
import { RefreshCw,X } from "lucide-react";
import { ModalDialog } from "@/shared/ui/modal-dialog";
import { formatDateTime } from "@/shared/lib/format";
import {
EMPTY_FILTERS,
TABLE_OPTIONS,
actorLabel,
errorMessage,
list,
roleName,
str,
} from "./rbac-audit-tab.rules";
import { FieldChanges,PermissionList } from "./rbac-audit-tab-parts";

export function RbacAuditTab() {
  const vm = useRbacAuditTab();
  const {
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
  } = vm;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <FilterField label="Qué cambió">
          <select
            className={SELECT_CLASS}
            value={filters.table ?? ""}
            onChange={(ev) => update({ table: (ev.target.value || null) as RbacAuditTable | null })}
          >
            <option value="">Todo (sin detalle por permiso)</option>
            {TABLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Desde">
          <Input
            type="date"
            value={filters.from ?? ""}
            onChange={(ev) => update({ from: ev.target.value || null })}
            className="w-40"
          />
        </FilterField>
        <FilterField label="Hasta">
          <Input
            type="date"
            value={filters.to ?? ""}
            onChange={(ev) => update({ to: ev.target.value || null })}
            className="w-40"
          />
        </FilterField>
        {hasFilters && (
          <BtnOutline onClick={() => setFilters(EMPTY_FILTERS)}>
            <X size={14} /> Limpiar
          </BtnOutline>
        )}
        <BtnOutline onClick={() => query.refetch()} title="Actualizar" aria-label="Actualizar">
          <RefreshCw
            size={14}
            className={query.isFetching && !query.isFetchingNextPage ? "animate-spin" : ""}
          />
        </BtnOutline>
      </div>

      <ActivityTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={setDetail}
        loading={query.isPending}
        error={errorMessage(query.error)}
        emptyMessage={
          hasFilters ? "No hay cambios con esos filtros." : "Todavía no hay cambios registrados."
        }
        hasMore={!!query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />

      {detail && detailDescription && (
        <ModalDialog
          open
          onClose={() => setDetail(null)}
          title={detailDescription.action}
          description={detailDescription.subject}
          size="lg"
        >
          <DetailRow label="Fecha y hora">
            {formatDateTime(detail.createdAt, { seconds: true })}
          </DetailRow>
          <DetailRow label="Quién">
            {actorLabel(detail)}
            {detail.actorEmail && detail.actorName && (
              <div className="text-xs text-muted-foreground">{detail.actorEmail}</div>
            )}
          </DetailRow>
          {(detail.tableName === "roles" || detail.tableName === "role_permissions") && (
            <DetailRow label="Rol">
              {roleName(
                detail,
                detail.tableName === "roles"
                  ? detail.rowId
                  : str(detail.after ?? detail.before, "role_id"),
              )}
            </DetailRow>
          )}

          {isPermissionSet ? (
            <>
              <PermissionList entry={detail} codes={list(detail.after, "added")} kind="added" />
              <PermissionList entry={detail} codes={list(detail.after, "removed")} kind="removed" />
            </>
          ) : detailFields.length > 0 ? (
            <FieldChanges entry={detail} fields={detailFields} />
          ) : (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Datos</div>
              <JsonBlock value={detail.after ?? detail.before} />
            </div>
          )}

          <div className="mt-4 text-[11px] text-muted-foreground">
            Registro técnico: <span className="font-mono">{detail.tableName}</span> ·{" "}
            <span className="font-mono">
              {detail.operation}
              {detail.event ? ` · ${detail.event}` : ""}
            </span>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
