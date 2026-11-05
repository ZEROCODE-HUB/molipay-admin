import { StatusMessage } from "@/shared/ui/status-message";
import { useBlocksTable } from "@/features/alerts/components/use-blocks-table";
import { userMessage } from "@/shared/lib/errors";
import { DataTable } from "@/shared/ui/data-table";
import { ActionsDropdown } from "@/shared/ui/actions-dropdown";
import { Pagination } from "@/shared/ui/pagination";
import { BlockDetailDialog } from "@/features/alerts/components/block-detail-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { FormDialog } from "@/shared/ui/form-dialog";
import { formatMoney } from "@/shared/lib/format";
import { PAGE_SIZES,SCOPE_LABEL } from "@/features/alerts/blocks-table.rules";

/**
 * Listado de bloqueos con aceptación por Compliance y desbloqueo.
 * Con `legajo` muestra solo los de ese cliente y oculta sus columnas (ficha).
 */
export function BlocksTable(props: { legajo?: string }) {
  const vm = useBlocksTable(props);
  const {
    enFicha,
    page,
    setPage,
    pageSize,
    setPageSize,
    panel,
    setPanel,
    list,
    rows,
    total,
    aceptando,
    setAceptando,
    liberando,
    setLiberando,
    notes,
    setNotes,
    sending,
    aceptar,
    liberar,
    exportar,
    getActions,
    columns,
  } = vm;

  return (
    <>
      {list.isError ? (
        <StatusMessage
          kind="error"
          errorTitle="No se pudieron cargar los bloqueos"
          message={userMessage(list.error)}
          onRetry={() => list.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            actions={(r) => <ActionsDropdown actions={getActions(r)} />}
            loading={list.isLoading}
            hidePagination
            serverFilterState={panel}
            onServerFilterChange={(f) => {
              setPage(0);
              setPanel(f);
            }}
            serverResultCount={total}
            onDownloadCSV={() => void exportar()}
            emptyMessage={
              enFicha
                ? "El cliente no tiene bloqueos."
                : "No hay bloqueos que coincidan con los filtros."
            }
          />
          <Pagination
            page={page + 1}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            pageSize={pageSize}
            total={total}
            countLabel="bloqueo(s)"
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

      <BlockDetailDialog {...vm} />

      <ConfirmDialog
        open={aceptando !== null}
        onClose={() => setAceptando(null)}
        onConfirm={aceptar}
        title="Aceptar bloqueo"
        message="Compliance confirma el bloqueo. La cuenta sigue bloqueada hasta que se libere explícitamente."
        confirmLabel="Aceptar"
      />

      {liberando && (
        <FormDialog
          open
          onClose={() => setLiberando(null)}
          title="Desbloquear"
          description={`${liberando.legajo} · ${SCOPE_LABEL[liberando.scope]}`}
          onSubmit={() => void liberar()}
          submitLabel={sending ? "Liberando…" : "Desbloquear"}
        >
          {liberando.heldAmount > 0 && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Se liberarán {formatMoney(liberando.heldAmount)} de depósitos retenidos: pasan de
              saldo retenido a disponible con su asiento contable.
            </div>
          )}
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Motivo de la liberación
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
          />
        </FormDialog>
      )}
    </>
  );
}
