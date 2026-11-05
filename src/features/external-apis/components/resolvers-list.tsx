import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { StatusMessage } from "@/shared/ui/status-message";
import { PAGE_SIZE } from "@/features/external-apis/resolvers.rules";
import type { ResolversPageVm } from "./use-resolvers-page";

export function ResolversList({
  isLoading,
  isError,
  err,
  refetch,
  isEmpty,
  columns,
  rows,
  getActions,
  total,
  page,
  totalPages,
  isFetching,
  setPage,
}: Pick<
  ResolversPageVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "isEmpty"
  | "columns"
  | "rows"
  | "getActions"
  | "total"
  | "page"
  | "totalPages"
  | "isFetching"
  | "setPage"
>) {
  return (
    <>
      {isLoading ? (
        <LoadingBlock label="Cargando resolvers…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar los resolvers"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <StatusMessage kind="empty" message="No hay resolvers que coincidan con la búsqueda." />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={PAGE_SIZE}
            showDownloadButton={false}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <Pagination
            variant="compact"
            page={page + 1}
            totalPages={totalPages}
            total={total}
            countLabel="resolver(es)"
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      )}
    </>
  );
}
