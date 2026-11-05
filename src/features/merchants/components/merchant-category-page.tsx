import { Pagination } from "@/shared/ui/pagination";
import { LoadingBlock } from "@/shared/ui/loading-block";
import { useMerchantCategoryPage } from "@/features/merchants/components/use-merchant-category-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { StatusMessage } from "@/shared/ui/status-message";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PAGE_SIZE } from "@/features/merchants/merchant-category.rules";
import { CategoryFormModal } from "./category-form-modal";

export function CategoryMerchantPage() {
  const vm = useMerchantCategoryPage();
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    canCreate,
    rows,
    total,
    isLoading,
    isFetching,
    isError,
    isEmpty,
    refetch,
    editTarget,
    setEditTarget,
    showNew,
    setShowNew,
    confirmDelete,
    setConfirmDelete,
    confirmAction,
    setConfirmAction,
    save,
    remove,
    getActions,
    columns,
    err,
    totalPages,
  } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <PageHeader
        title="Códigos de categoría"
        description="Administración de códigos de categoría para comercios."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!canCreate}>
            <Plus size={14} /> Nueva categoría
          </BtnPrimary>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="buscar">Buscar</Label>
          <Input
            id="buscar"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Código, nombre o descripción…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <Select
            id="f-estado"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "activo" | "inactivo" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Cargando categorías…" />
      ) : isError ? (
        <StatusMessage
          kind={err?.kind === "permission" ? "permission" : "error"}
          errorTitle="Ocurrió un error al cargar las categorías"
          message={err?.message ?? "Error desconocido"}
          onRetry={() => refetch()}
        />
      ) : isEmpty ? (
        <StatusMessage kind="empty" message="No hay categorías que coincidan con la búsqueda." />
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
            countLabel="categoría(s)"
            disabled={isFetching}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      )}

      {(showNew || editTarget) && (
        <CategoryFormModal
          categoria={editTarget}
          onClose={() => {
            setShowNew(false);
            setEditTarget(null);
          }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar categoría"
        message={`¿Estás seguro de eliminar la categoría "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={remove}
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
