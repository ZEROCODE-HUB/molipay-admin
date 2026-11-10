import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Eye, Inbox, Upload } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { BtnPrimary } from "@/shared/ui/button";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES } from "@/features/payment-links/batches.rules";

import type { BatchesPageVm } from "./use-batches-page";

export function BatchesTable({
  isLoading,
  isError,
  err,
  refetch,
  batches,
  tab,
  canGestionar,
  setLoadCsv,
  columns,
  buttonAction,
  getActions,
  page,
  totalPages,
  pageSize,
  total,
  isFetching,
  setPage,
  setPageSize,
  summaryColumns,
  summaryData,
  setMerchantDetail,
}: Pick<
  BatchesPageVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "batches"
  | "tab"
  | "canGestionar"
  | "setLoadCsv"
  | "columns"
  | "buttonAction"
  | "getActions"
  | "page"
  | "totalPages"
  | "pageSize"
  | "total"
  | "isFetching"
  | "setPage"
  | "setPageSize"
  | "summaryColumns"
  | "summaryData"
  | "setMerchantDetail"
>) {
  return (
    <>
      {isLoading ? (
        <LoadingBlock label="Cargando lotes…" />
      ) : isError ? (
        <StatusMessage kind="error" message={err?.message ?? "Error"} onRetry={() => refetch()} />
      ) : batches.length === 0 && tab === "lotes" ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay lotes que coincidan con los filtros.</p>
          {canGestionar && (
            <BtnPrimary onClick={() => setLoadCsv({ lote: null })}>
              <Upload size={14} />
              Subir CSV de Payway
            </BtnPrimary>
          )}
        </div>
      ) : tab === "lotes" ? (
        <>
          <DataTable
            columns={columns}
            data={batches}
            keyExtractor={(r) => r.id}
            actions={(r) => (
              <div className="flex items-center gap-1.5">
                {buttonAction(r)}
                <ActionsDropdown actions={getActions(r)} />
              </div>
            )}
            hidePagination
            showGlobalFilter={false}
            dateFilterColumns={[]}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="lotes"
            pageSizes={PAGE_SIZES}
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
          />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Total consolidado que corresponde pagar a cada comercio (suma de todos sus lotes por
            bandera). Pendiente de acreditar = máximo adelantable. Agregación client-side sobre la
            página actual; para total global sin paginación usar query separada.
          </p>
          <DataTable
            columns={summaryColumns}
            data={summaryData}
            keyExtractor={(r) => r.comercioId}
            actions={(r) => (
              <ActionsDropdown
                actions={[{ label: "Ver detalle", icon: Eye, onClick: () => setMerchantDetail(r) }]}
              />
            )}
            hidePagination
            showGlobalFilter={false}
          />
        </>
      )}
    </>
  );
}
