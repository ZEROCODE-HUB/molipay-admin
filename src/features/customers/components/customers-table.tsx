import { DataTable, EMPTY_TABLE_FILTERS } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { Pagination } from "@/shared/ui/pagination";
import { visibleColumns } from "./customers-parts";
import { PAGE_SIZES } from "@/features/customers/customers.rules";
import type { CustomersPageVm } from "./use-customers-page";

// La tabla no filtra: los resultados ya llegan filtrados del servidor.
const noop = () => undefined;

/** Solo la tabla cambia al filtrar o cargar: los filtros viven afuera, en la pagina. */
export function CustomersTable({
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
  CustomersPageVm,
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
        errorTitle="Ocurrió un error al cargar los usuarios"
        message={err?.message ?? "Error desconocido"}
        onRetry={() => refetch()}
      />
    );
  }
  return (
    <>
      <DataTable
        columns={visibleColumns}
        data={data}
        keyExtractor={(r) => r.legajo}
        actions={(r) => <ActionsDropdown actions={getActions(r)} />}
        loading={isLoading || isRefreshing}
        emptyMessage="No hay usuarios que coincidan con la búsqueda."
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
        countLabel="usuario(s)"
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
