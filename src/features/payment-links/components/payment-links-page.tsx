import { StatusMessage } from "@/shared/ui/status-message";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { usePaymentLinksPage } from "@/features/payment-links/components/use-payment-links-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { Inbox } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PAGE_SIZES } from "@/features/payment-links/payment-links.rules";
import { LinkDetail } from "./link-detail";

export function PaymentLinksPage() {
  const vm = usePaymentLinksPage();
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersPanel,
    applyFilters,
    isLoading,
    isError,
    refetch,
    isFetching,
    rows,
    total,
    detail,
    setDetail,
    confirm,
    setConfirm,
    getActions,
    columns,
    err,
    totalPages,
  } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Links de Pago"
        description="Links gestionados por MoliPay. PayWay crea en Pendiente; Admin gestiona ciclo completo (ver detalle para método/tarjeta/cuotas)."
      />
      {isLoading ? (
        <LoadingBlock label="Cargando enlaces…" />
      ) : isError ? (
        <StatusMessage kind="error" message={err?.message ?? "Error"} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-sm text-muted-foreground">
          <Inbox size={28} />
          <p>No hay enlaces de pago.</p>
          <p className="text-xs">
            Crea un enlace en Enterprise → aparecerá aquí como Pendiente de aprobación.
          </p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            hidePagination
            serverFilterState={filtersPanel}
            onServerFilterChange={applyFilters}
            serverResultCount={total}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="enlace(s)"
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
      {detail && <LinkDetail enlace={detail} onClose={() => setDetail(null)} />}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          onConfirm={confirm.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
