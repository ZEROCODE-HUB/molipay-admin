import { ErrorNotice } from "@/shared/ui/error-notice";
import { userMessage } from "@/shared/lib/errors";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Plus } from "lucide-react";
import { BtnPrimary } from "@/shared/ui/button";
import { Pagination } from "@/shared/ui/pagination";
import { PAGE_SIZES } from "@/features/alerts/block-settings.rules";

import type { BlockSettingsPageVm } from "./use-block-settings-page";

export function UserBlockParameters({
  openNew,
  list,
  columns,
  rows,
  getActions,
  filters,
  setPage,
  setFilters,
  total,
  exportar,
  page,
  totalPages,
  pageSize,
  setPageSize,
}: Pick<
  BlockSettingsPageVm,
  | "openNew"
  | "list"
  | "columns"
  | "rows"
  | "getActions"
  | "filters"
  | "setPage"
  | "setFilters"
  | "total"
  | "exportar"
  | "page"
  | "totalPages"
  | "pageSize"
  | "setPageSize"
>) {
  return (
    <div className="bg-card border rounded-lg p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Parámetros de usuarios
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Umbrales de depósitos configurados individualmente por usuario (reemplazan a los
            generales)
          </p>
        </div>
        <BtnPrimary onClick={openNew}>
          <Plus size={14} /> Agregar nuevos parámetros de usuario
        </BtnPrimary>
      </div>

      {list.isError ? (
        <ErrorNotice>No se pudieron cargar los parámetros: {userMessage(list.error)}</ErrorNotice>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={list.isLoading}
            hidePagination
            serverFilterState={filters}
            onServerFilterChange={(f) => {
              setPage(0);
              setFilters(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage="No hay parámetros individuales cargados."
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="usuario(s)"
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
    </div>
  );
}
