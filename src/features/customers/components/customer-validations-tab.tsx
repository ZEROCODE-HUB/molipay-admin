import { Download,RefreshCw } from "lucide-react";
import { DataTable } from "@/shared/ui/data-table";
import { downloadCSV,validationsColumns } from "@/features/customers/customer-detail.rules";
import { CustomerSection } from "./customer-section";

import type { CustomerDetailPageVm } from "./use-customer-detail-page";

export function CustomerValidationsTab({
  activeTab,
  validationsQuery,
  forzarNewValidation,
  forzando,
}: Pick<
  CustomerDetailPageVm,
  "activeTab" | "validationsQuery" | "forzarNewValidation" | "forzando"
>) {
  return (
    <>
      {activeTab === "validaciones" && (
        <CustomerSection
          titulo="Validaciones automáticas"
          loading={validationsQuery.isLoading}
          error={validationsQuery.isError ? validationsQuery.error : null}
          onRetry={validationsQuery.refetch}
          vacio={!validationsQuery.isLoading && (validationsQuery.data?.length ?? 0) === 0}
        >
          <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
            <button
              type="button"
              onClick={forzarNewValidation}
              disabled={forzando}
              className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw size={16} className={forzando ? "animate-spin" : ""} /> Forzar nueva
              validación
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCSV("validaciones.csv", [
                  ["Proveedor", "Estado", "Fecha"],
                  ...(validationsQuery.data ?? []).map((v) => [v.proveedor, v.estado, v.fecha]),
                ])
              }
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Download size={16} /> Descargar CSV
            </button>
          </div>
          <DataTable
            columns={validationsColumns}
            data={validationsQuery.data ?? []}
            keyExtractor={(v) => v.id}
            emptyMessage="Sin validaciones para este cliente"
            showDownloadButton={false}
          />
        </CustomerSection>
      )}
    </>
  );
}
