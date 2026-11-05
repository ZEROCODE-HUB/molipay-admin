import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { Inbox } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import type { CvuRow } from "@/features/customers/subaccounts.supabase";
import { columns } from "@/features/customers/components/customer-cvu-parts";
import { PAGE_SIZES } from "@/features/customers/customer-cvu.rules";
import type { CustomerCvuPageVm } from "./use-customer-cvu-page";

export function CvuTable({
  isLoading,
  isError,
  err,
  refetch,
  rows,
  getActions,
  filtersPanel,
  applyFilters,
  total,
  statusFilter,
  setStatusFilter,
  setPage,
  page,
  totalPages,
  pageSize,
  isFetching,
  setPageSize,
}: Pick<
  CustomerCvuPageVm,
  | "isLoading"
  | "isError"
  | "err"
  | "refetch"
  | "rows"
  | "getActions"
  | "filtersPanel"
  | "applyFilters"
  | "total"
  | "statusFilter"
  | "setStatusFilter"
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
        <LoadingBlock label="Cargando CVU…" />
      ) : isError ? (
        <StatusMessage kind="error" message={err?.message ?? "Error"} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay CVU que coincidan.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows.map((r) => ({
              ...r,
              _legajo: r.legajo,
              _cuit: r.cliente?.cuit ?? "",
              _correo: r.cliente?.correo ?? r.email,
              _nombre: r.nombre,
              _apellido: r.apellido,
              _tipo: r.tipo,
              _cvu: r.cbu ?? null,
              _cbk: r.cbu ? `CBK-${r.cbu.slice(-12)}` : "—",
              _alias: r.cbu ? r.cbu.slice(-6) : "—",
              _estado: r.estado,
              _fechaAlta: r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-AR") : "—",
              _fechaAltaRaw: r.createdAt,
            }))}
            keyExtractor={(r: any) => r.id}
            actions={(r: any) => <ActionsDropdown actions={getActions(r as CvuRow)} />}
            hidePagination
            serverFilterState={filtersPanel}
            onServerFilterChange={applyFilters}
            serverResultCount={total}
            extraFilters={
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full sm:min-w-[130px] h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Todos</option>
                  <option value="Activa">Habilitado</option>
                  <option value="Pausada">Deshabilitado</option>
                </select>
              </div>
            }
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="CVU"
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
