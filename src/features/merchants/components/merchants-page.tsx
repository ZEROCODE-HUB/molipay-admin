import { LoadingBlock } from "@/shared/ui/loading-block";
import { MerchantsFilters } from "./merchants-filters";
import { useMerchantsPage } from "./use-merchants-page";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Plus } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { StatusMessage } from "@/shared/ui/status-message";
import { Pagination } from "@/shared/ui/pagination";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PAGE_SIZES } from "@/features/merchants/merchants.rules";
import { MerchantDetail } from "./merchant-detail";
import { MerchantFormModal } from "./merchant-form-modal";

export function MerchantsPage() {
  const vm = useMerchantsPage();
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    canCreate,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    isEmpty,
    refetch,
    categories,
    customers,
    adminUsers,
    detail,
    setDetail,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    confirmDelete,
    setConfirmDelete,
    disableReason,
    setDisableReason,
    isSaving,
    confirmAction,
    setConfirmAction,
    save,
    disable,
    getActions,
    columns,
    err,
    totalPages,
  } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Comercios"
        description="Listado centralizado de comercios de la plataforma, recuperados desde la base de datos."
        action={
          <BtnPrimary
            type="button"
            onClick={() => setShowNew(true)}
            disabled={!canCreate || !customers}
          >
            <Plus size={14} /> Nuevo comercio
          </BtnPrimary>
        }
      />

      <MerchantsFilters {...vm} />

      {isLoading ? (
        <LoadingBlock label="Cargando comercios…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar los comercios"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <StatusMessage kind="empty" message="No hay comercios que coincidan con la búsqueda." />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            pageSize={pageSize}
            showDownloadButton={false}
            showGlobalFilter={false}
            dateFilterColumns={[]}
            hidePagination
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
          />
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            countLabel="comercio(s)"
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

      {detail && <MerchantDetail comercio={detail} onClose={() => setDetail(null)} />}

      {(showNew || editTarget) && (
        <MerchantFormModal
          comercio={editTarget}
          clientes={customers ?? []}
          categorias={categories ?? []}
          adminUsers={adminUsers ?? []}
          isSaving={isSaving}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => {
          setConfirmDelete(null);
          setDisableReason("");
        }}
        title="Deshabilitar comercio"
        message={`¿Deshabilitar el comercio "${confirmDelete?.usuario}"? El comercio pasará a estado "Desactivado" y no podrá operar. Esta acción queda registrada en el historial.`}
        confirmLabel="Deshabilitar"
        variant="danger"
        onConfirm={disable}
        extraContent={
          <div className="mt-3">
            <label className="text-xs font-semibold">Motivo de deshabilitación (requerido)</label>
            <textarea
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              rows={3}
              placeholder="Motivo de la deshabilitación..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        }
      />

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </PermissionGuard>
  );
}
