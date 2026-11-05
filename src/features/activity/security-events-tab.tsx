import { useSecurityEventsTab } from "@/features/activity/use-security-events-tab";
import { SecurityEventsTable } from "@/features/activity/security-events-table";
import { ActivityTable } from "@/features/activity/activity-ui";
import { SecurityEventDetailModal } from "@/features/activity/security-event-detail-modal";
import { errorMessage } from "./security-events-tab.rules";

export function SecurityEventsTab() {
  const vm = useSecurityEventsTab();
  const { setDetail, query, rows, hasFilters, columns } = vm;

  return (
    <div className="space-y-3">
      <SecurityEventsTable {...vm} />

      <ActivityTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={setDetail}
        loading={query.isPending}
        error={errorMessage(query.error)}
        emptyMessage={
          hasFilters ? "No hay eventos con esos filtros." : "Todavía no hay eventos de seguridad."
        }
        hasMore={!!query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />

      <SecurityEventDetailModal {...vm} />
    </div>
  );
}
