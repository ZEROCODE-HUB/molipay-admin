import { useResolversPage } from "@/features/external-apis/components/use-resolvers-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { STATUSES_RESOLVER,type ResolverStatus } from "@/infrastructure/supabase/legacy/types";
import { ResolversList } from "@/features/external-apis/components/resolvers-list";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ResolverFormModal } from "./resolver-form-modal";

export function ResolversPage() {
  const vm = useResolversPage();
  const {
    setPage,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    canCreate,
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
  } = vm;

  return (
    <PermissionGuard recurso="resolvers">
      <PageHeader
        title="Resolvers"
        description="Gestión de resolvers PCT (pagos con transferencia)."
        action={
          <BtnPrimary type="button" onClick={() => setShowNew(true)} disabled={!canCreate}>
            <Plus size={14} /> Nuevo resolver
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
            placeholder="Nombre, CUIT o URL…"
          />
        </div>
        <div>
          <Label htmlFor="f-estado">Estado</Label>
          <Select
            id="f-estado"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ResolverStatus | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {STATUSES_RESOLVER.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <ResolversList {...vm} />

      {(showNew || editTarget) && (
        <ResolverFormModal
          resolver={editTarget}
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
        title="Eliminar resolver"
        message={`¿Estás seguro de eliminar el resolver "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
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
