import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES } from "@/features/movements/movement-lines-table.rules";
import type { MovementLinesTableVm } from "./use-movement-lines-table";

export function MovementLinesBody({
  isLoading,
  isError,
  err,
  refetch,
  columns,
  rows,
  getActions,
  filtersExtra,
  filtersPanel,
  applyFilters,
  total,
  embedded,
  page,
  totalPages,
  pageSize,
  isFetching,
  setPage,
  setPageSize,
}: Pick<
  MovementLinesTableVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "columns"
  | "rows"
  | "getActions"
  | "filtersExtra"
  | "filtersPanel"
  | "applyFilters"
  | "total"
  | "embedded"
  | "page"
  | "totalPages"
  | "pageSize"
  | "isFetching"
  | "setPage"
  | "setPageSize"
>) {
  return (
    <>
      {isLoading ? (
        <LoadingBlock label="Cargando movimientos…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar los movimientos"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.lineId + ":" + r.lineNo}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            extraFilters={filtersExtra}
            serverFilterState={filtersPanel}
            onServerFilterChange={applyFilters}
            serverResultCount={total}
            emptyMessage={
              embedded
                ? "El cliente no tiene movimientos que coincidan con los filtros."
                : "No hay movimientos que coincidan con los filtros aplicados."
            }
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="línea(s)"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
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
