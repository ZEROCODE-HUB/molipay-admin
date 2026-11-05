import { LoadingBlock } from "@/shared/ui/loading-block";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { FILTER_STATUSES_OPTIONS } from "@/features/customers/customer-status.rules";
import { Pagination } from "@/shared/ui/pagination";
import { StatusMessage } from "@/shared/ui/status-message";
import { columns } from "@/features/customers/components/companies-parts";
import { PAGE_SIZES } from "@/features/customers/companies.rules";
import type { CompaniesPageVm } from "./use-companies-page";

export function CompaniesTable({
  isLoading,
  isError,
  err,
  refetch,
  isEmpty,
  data,
  getActions,
  filtersPanel,
  applyFilters,
  total,
  filterStatus,
  setFilterStatus,
  setPage,
  page,
  totalPages,
  pageSize,
  isFetching,
  setPageSize,
}: Pick<
  CompaniesPageVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "isEmpty"
  | "data"
  | "getActions"
  | "filtersPanel"
  | "applyFilters"
  | "total"
  | "filterStatus"
  | "setFilterStatus"
  | "setPage"
  | "page"
  | "totalPages"
  | "pageSize"
  | "isFetching"
  | "setPageSize"
>) {
  return (
    <>
      {isLoading ? (
        <LoadingBlock label="Cargando…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar las personas jurídicas"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <StatusMessage
          kind="empty"
          message="No hay personas jurídicas que coincidan con la búsqueda."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.legajo}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            serverFilterState={filtersPanel}
            onServerFilterChange={applyFilters}
            serverResultCount={total}
            extraFilters={
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(0);
                  }}
                  className="w-full sm:min-w-[180px] h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Todos</option>
                  {FILTER_STATUSES_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="resultado(s)"
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
