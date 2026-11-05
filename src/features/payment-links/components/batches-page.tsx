import { BatchesHeader } from "./batches-header";
import { BatchesKpis } from "./batches-kpis";
import { BatchesFilters } from "./batches-filters";
import { BatchesTable } from "./batches-table";
import { useBatchesPage } from "./use-batches-page";
import { PermissionGuard } from "@/features/rbac/access-gate";
import { SimulateChargebacksModal } from "@/features/payment-links/components/simulate-chargebacks-modal";
import { LoadCsvModal } from "@/features/payment-links/components/upload-csv-modal";
import { BatchTestModal } from "./batch-test-modal";
import { ConfirmCreditModal } from "@/features/payment-links/components/confirm-credit-modal";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { BatchDetail } from "./batch-detail";
import { MerchantDetailModal } from "./merchant-detail-modal";

export function BatchesPage() {
  const vm = useBatchesPage();
  const {
    navigate,
    search_,
    tab,
    setTab,
    detail,
    setDetail,
    merchantDetail,
    setMerchantDetail,
    confirm,
    setConfirm,
    loadCsv,
    setLoadCsv,
    simulateCc,
    setSimulateCc,
    testOpen,
    setTestOpen,
    confirmCredit,
    setConfirmCredit,
    batches,
    onSubirCsv,
    handleCsvCargado,
    handleCredited,
  } = vm;

  return (
    <PermissionGuard recurso="comercios">
      <BatchesHeader {...vm} />

      {/* KPIs: 4 cards por estado. Mismas fechas que la grilla. */}
      <BatchesKpis {...vm} />

      <BatchesFilters {...vm} />

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("lotes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "lotes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lotes por bandera
        </button>
        <button
          onClick={() => setTab("resumen")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "resumen"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Resumen por comercio
        </button>
      </div>

      <BatchesTable {...vm} />

      {detail && (
        <BatchDetail
          lote={detail}
          onClose={() => {
            setDetail(null);
            if (search_.lote) void navigate({ to: "/admin/comercios/link-pago/lotes", search: {} });
          }}
          onSubirCsv={onSubirCsv}
          onAcreditar={(l) => {
            setDetail(null);
            setConfirmCredit(l);
          }}
        />
      )}

      {simulateCc && <SimulateChargebacksModal onClose={() => setSimulateCc(false)} />}
      {testOpen && <BatchTestModal onClose={() => setTestOpen(false)} />}
      {loadCsv && (
        <LoadCsvModal
          open={!!loadCsv}
          lote={loadCsv.lote}
          onClose={() => setLoadCsv(null)}
          onCargado={handleCsvCargado}
        />
      )}

      {confirmCredit && (
        <ConfirmCreditModal
          lote={confirmCredit}
          onClose={() => setConfirmCredit(null)}
          onAcreditado={handleCredited}
        />
      )}

      {merchantDetail && (
        <MerchantDetailModal
          data={merchantDetail}
          lotes={batches}
          onClose={() => setMerchantDetail(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Cerrar"
          variant="default"
          onConfirm={() => setConfirm(null)}
        />
      )}
    </PermissionGuard>
  );
}
