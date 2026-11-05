import { ErrorNotice } from "@/shared/ui/error-notice";
import { useTransactionProfilesCard } from "@/features/alerts/components/use-transaction-profiles-card";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { userMessage } from "@/shared/lib/errors";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import { TransactionProfileDialog } from "@/features/alerts/components/transaction-profile-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PAGE_SIZES } from "@/features/alerts/transaction-profiles-card.rules";

export function ProfilesTransaccionalesCard() {
  const vm = useTransactionProfilesCard();
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    setFilters,
    list,
    rows,
    total,
    deleting,
    setDeleting,
    open,
    remove,
    exportar,
    getActions,
    columns,
  } = vm;

  return (
    <div className="bg-card border rounded-lg p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Perfil transaccional esperado por cliente
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base de la alerta "Exceso del perfil transaccional". Volumen mensual = depósitos +
            transferencias salientes (sin internas).
          </p>
        </div>
        <BtnPrimary onClick={() => open()}>
          <Plus size={14} /> Cargar perfil
        </BtnPrimary>
      </div>

      {list.isError ? (
        <ErrorNotice>No se pudieron cargar los perfiles: {userMessage(list.error)}</ErrorNotice>
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
            emptyMessage="No hay perfiles transaccionales cargados."
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="perfil(es)"
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

      <TransactionProfileDialog {...vm} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Eliminar perfil transaccional"
        message="El cliente deja de evaluarse por exceso de perfil hasta que se le cargue uno nuevo."
        confirmLabel="Eliminar"
      />
    </div>
  );
}
