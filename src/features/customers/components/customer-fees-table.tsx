import { LoadingBlock } from "@/shared/ui/loading-block";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES } from "@/features/customers/customer-fees.rules";
import { columns } from "./customer-fees-parts";

import type { CustomerFeesPageVm } from "./use-customer-fees-page";

export function CustomerFeesTable({
  isLoading,
  isError,
  err,
  refetch,
  data,
  getActions,
  scope,
  setScope,
  setPage,
  legajoFilter,
  setLegajoFilter,
  cvuFilter,
  setCvuFilter,
  filtersPanel,
  applyFilters,
  total,
  page,
  totalPages,
  pageSize,
  isFetching,
  setPageSize,
}: Pick<
  CustomerFeesPageVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "data"
  | "getActions"
  | "scope"
  | "setScope"
  | "setPage"
  | "legajoFilter"
  | "setLegajoFilter"
  | "cvuFilter"
  | "setCvuFilter"
  | "filtersPanel"
  | "applyFilters"
  | "total"
  | "page"
  | "totalPages"
  | "pageSize"
  | "isFetching"
  | "setPageSize"
>) {
  return (
    <>
      {isLoading ? (
        <LoadingBlock label="Cargando comisiones…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar las comisiones"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            extraFilters={
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 min-w-[170px]">
                  <label className="text-xs font-medium text-muted-foreground">Alcance</label>
                  <select
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value as typeof scope);
                      setPage(0);
                    }}
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="cvu">Por CVU</option>
                    <option value="cuenta">Toda la cuenta (respaldo)</option>
                  </select>
                </div>
                <div className="space-y-1 min-w-[170px]">
                  <label className="text-xs font-medium text-muted-foreground">Legajo</label>
                  <input
                    value={legajoFilter}
                    onChange={(e) => {
                      setLegajoFilter(e.target.value);
                      setPage(0);
                    }}
                    placeholder="LPJ-30..."
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1 min-w-[220px]">
                  <label className="text-xs font-medium text-muted-foreground">CVU</label>
                  <input
                    value={cvuFilter}
                    onChange={(e) => {
                      setCvuFilter(e.target.value);
                      setPage(0);
                    }}
                    placeholder="0000003100..."
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm font-mono"
                  />
                </div>
              </div>
            }
            serverFilterState={filtersPanel}
            onServerFilterChange={applyFilters}
            serverResultCount={total}
            emptyMessage="No hay comisiones que coincidan con los filtros."
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="comisión(es)"
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
