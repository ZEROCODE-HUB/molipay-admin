import { StatusMessage } from "@/shared/ui/status-message";
import { userMessage } from "@/shared/lib/errors";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES } from "@/features/alerts/alerts-table.rules";
import type { AlertsTableVm } from "./use-alerts-table";

export function AlertsListBody({
  list,
  columns,
  rows,
  getActions,
  panel,
  setPage,
  setPanel,
  total,
  exportar,
  enFicha,
  page,
  pageSize,
  setPageSize,
}: Pick<
  AlertsTableVm,
  | "list"
  | "columns"
  | "rows"
  | "getActions"
  | "panel"
  | "setPage"
  | "setPanel"
  | "total"
  | "exportar"
  | "enFicha"
  | "page"
  | "pageSize"
  | "setPageSize"
>) {
  return (
    <>
      {list.isError ? (
        <StatusMessage
          kind="error"
          errorTitle="No se pudieron cargar las alertas"
          message={userMessage(list.error)}
          onRetry={() => list.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={list.isLoading}
            hidePagination
            serverFilterState={panel}
            onServerFilterChange={(f) => {
              setPage(0);
              setPanel(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage={
              enFicha
                ? "El cliente no tiene alertas que coincidan con los filtros."
                : "No hay alertas que coincidan con los filtros."
            }
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="alerta(s)"
            pageSizes={PAGE_SIZES}
            disabled={list.isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      )}
    </>
  );
}
