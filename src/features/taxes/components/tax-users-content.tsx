import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { DataTable } from "@/shared/ui/data-table";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { StatusMessage } from "@/shared/ui/status-message";
import { PAGE_SIZE } from "@/features/taxes/tax-users.rules";
import { TaxesByCollectTab } from "./taxes-by-collect-tab";

import type { TaxUsersPageVm } from "./use-tax-users-page";

export function TaxUsersContent({
  tab,
  searchInput,
  setSearchInput,
  setPage,
  statusFilter,
  setStatusFilter,
  searchFrom,
  setSearchFrom,
  searchTo,
  setSearchTo,
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
}: Pick<
  TaxUsersPageVm,
  | "tab"
  | "searchInput"
  | "setSearchInput"
  | "setPage"
  | "statusFilter"
  | "setStatusFilter"
  | "searchFrom"
  | "setSearchFrom"
  | "searchTo"
  | "setSearchTo"
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
>) {
  return (
    <>
      {tab === "por_cobrar" ? (
        <TaxesByCollectTab />
      ) : (
        <>
          <div className="mb-4 bg-card border rounded-lg p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="buscar">Buscar</Label>
              <Input
                id="buscar"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(0);
                }}
                placeholder="Legajo, código o nombre del impuesto…"
              />
            </div>
            <div>
              <Label htmlFor="f-estado">Estado</Label>
              <Select
                id="f-estado"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "Activo" | "Inactivo" | "");
                  setPage(0);
                }}
              >
                <option value="">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-desde">Fecha desde</Label>
              <Input
                id="f-desde"
                type="date"
                value={searchFrom}
                onChange={(e) => {
                  setSearchFrom(e.target.value);
                  setPage(0);
                }}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="f-hasta">Fecha hasta</Label>
              <Input
                id="f-hasta"
                type="date"
                value={searchTo}
                onChange={(e) => {
                  setSearchTo(e.target.value);
                  setPage(0);
                }}
                className="h-9"
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingBlock label="Cargando asignaciones…" />
          ) : isError ? (
            <StatusMessage
              kind={err?.kind === "permission" ? "permission" : "error"}
              errorTitle="Ocurrió un error al cargar las asignaciones"
              message={err?.message ?? "Error desconocido"}
              onRetry={() => refetch()}
            />
          ) : isEmpty ? (
            <StatusMessage
              kind="empty"
              message="No hay asignaciones que coincidan con la búsqueda."
            />
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
                countLabel="asignación(es)"
                disabled={isFetching}
                onPageChange={(p) => setPage(p - 1)}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
