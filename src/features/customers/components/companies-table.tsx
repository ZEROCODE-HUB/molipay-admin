import { DataTable, EMPTY_TABLE_FILTERS } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { Pagination } from "@/shared/ui/pagination";
import { columns } from "@/features/customers/components/companies-parts";
import { PAGE_SIZES } from "@/features/customers/companies.rules";
import type { CompaniesPageVm } from "./use-companies-page";

// La tabla no filtra: los resultados ya llegan filtrados del servidor.
const noop = () => undefined;

/** Solo la tabla cambia al filtrar o cargar: los filtros viven afuera, en la pagina. */
export function CompaniesTable({
  isLoading,
  isRefreshing,
  isError,
  err,
  refetch,
  data,
  getActions,
  total,
  setPage,
  page,
  totalPages,
  pageSize,
  isFetching,
  setPageSize,
}: Pick<
  CompaniesPageVm,
  | "isLoading"
  | "isRefreshing"
  | "isError"
  | "err"
  | "refetch"
  | "data"
  | "getActions"
  | "total"
  | "setPage"
  | "page"
  | "totalPages"
  | "pageSize"
  | "isFetching"
  | "setPageSize"
>) {
  if (isError) {
    return (
      <StatusMessage
        kind={err?.kind === "permission" ? "permission" : "error"}
        errorTitle="Ocurrió un error al cargar las personas jurídicas"
        message={err?.message ?? "Error desconocido"}
        onRetry={() => refetch()}
      />
    );
  }
  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        loading={isLoading || isRefreshing}
        emptyMessage="No hay personas jurídicas que coincidan con la búsqueda."
        hidePagination
        showGlobalFilter={false}
        dateFilterColumns={[]}
        serverFilterState={EMPTY_TABLE_FILTERS}
        onServerFilterChange={noop}
        serverResultCount={total}
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
  );
}
